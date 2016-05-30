<#
    .DESCRIPTION
    Sets up the environment variables needed to run the Killrvideo docker-compose commands.
    
    .PARAMETER Force
    Force the setup script to run even if it detects that the envirnonment variables are
    already setup. False by default.
#>
[CmdletBinding()]
Param (
    [parameter(Mandatory=$false)]
    [switch]
    $Force
)

# Custom type representing the type of docker installation
Add-Type -TypeDefinition "public enum DockerType { Windows, Toolbox }"

function Get-DockerType {
    <#
    .DESCRIPTION
    Determines what type of docker installation is present (Docker for Windows or Docker Toolbox)
    
    .OUTPUTS
    A DockerType enum value indicating the docker environment
    #>
    [CmdletBinding()]
    Param()
    
    Write-Host 'Determining docker installation type'
    
    # Docker toolbox sets an install path environment variable so check for it
    $dt = [DockerType]::Windows
    if ($Env:DOCKER_TOOLBOX_INSTALL_PATH) {
        $dt = [DockerType]::Toolbox
    }
    
    Write-Verbose " => Using docker type $dt"
    $dt
}

function Get-DockerVirtualMachineIp {
    <#
    .DESCRIPTION
    Find the IP address of the docker virtual machine
    
    .OUTPUTS
    The IP Address of the docker virtual machine
    #>
    [CmdletBinding()]
    Param ()
    
    # Determine what type of docker installation we have
    $dockerType = Get-DockerType
    
    Write-Host 'Finding docker Virtual Machine IP'
    
    if ($dockerType -eq [DockerType]::Windows) {
        # In the DfW beta, the VM will be reachable via a host named 'docker'
        $DOCKER_WINDOWS_HOST_NAME = 'docker'
        $dnsResults = Resolve-DnsName $DOCKER_WINDOWS_HOST_NAME -ErrorAction SilentlyContinue
        if ($dnsResults) {
            Write-Verbose " => Able to resolve hostname '$DOCKER_WINDOWS_HOST_NAME' at $($dnsResults.IPAddress)"
            $dnsResults.IPAddress
            return
        }
        throw "Unable to resolve host '$DOCKER_WINDOWS_HOST_NAME'. Is Docker for Windows started?"
    } else {
        throw 'TODO: Docker toolbox support'
    }
}

function Get-NetworkAddress {
    <#
    .DESCRIPTION
    Get a network address from an IP address and subnet mask
    
    .PARAMETER Address
    The IP address
    
    .PARAMETER SubnetMask
    The subnet mask
    
    .OUTPUTS
    The IP address of the network.
    #>
    [CmdletBinding()]
    Param (
        [parameter(Mandatory=$true)]
        [System.Net.IPAddress]
        $Address,
        
        [parameter(Mandatory=$false)]
        [System.Net.IPAddress]
        $SubnetMask
    )
    
    # Set default subnet mask if not provided
    if ($SubnetMask -eq $null) {
        $SubnetMask = [System.Net.IPAddress]::Parse("255.255.255.0")
    }
    
    # Get as bytes
    $ipBytes = $Address.GetAddressBytes()
    $subnetBytes = $SubnetMask.GetAddressBytes()
    
    # Create array for network bytes and use bitwise and to apply subnet mask
    $networkBytes = @()
    for ($i = 0; $i -le 3; $i++) {
        $networkBytes += $ipBytes[$i] -band $subnetBytes[$i]
    }
    
    # Return as IPAddress (constructor takes a single array as argument)
    New-Object System.Net.IPAddress -ArgumentList @(,$networkBytes)
}

function Get-HostIp {
    <#
    .DESCRIPTION
    Get the Host's IP address that's on the same network as the provided vmIp
    
    .PARAMETER VirtualMachineIPAddress
    The virtual machine's IP address
    
    .OUTPUTS
    The IP address on the host that's on the same network.
    #>
    [CmdletBinding()]
    Param (
        [parameter(Mandatory=$true)]
        [string]
        $VirtualMachineIPAddress
    )
    
    Write-Host 'Finding host IP on same network as docker Virtual Machine'
    
    $addresses = Get-NetIPAddress | ? AddressFamily -eq IPv4 | Select IPAddress, SubnetMask
    foreach($address in $addresses) {
        $vmNetworkAddress = Get-NetworkAddress -Address $VirtualMachineIPAddress -SubnetMask $address.SubnetMask
        $networkAddress = Get-NetworkAddress -Address $address.IPAddress -SubnetMask $address.SubnetMask
        
        if ($networkAddress.Equals($vmNetworkAddress)) {
            Write-Verbose " => Found host IP $($address.IPAddress)"
            $address.IPAddress
            return
        }
    }
    
    throw "Could not find a host IP address on same network as $VirtualMachineIPAddress"
}

# See if we've already setup the environment previously
$scriptPath = Split-Path -parent $PSCommandPath
$envFilePath = "$scriptPath\killrvideo.env" 
if ((Test-Path $envFilePath) -and ($Force -eq $false)) {
    Write-Host 'Environment is already setup'
    return
}


# Figure out the network setup
$dockerVmIp = Get-DockerVirtualMachineIp
$hostIp = Get-HostIp $dockerVmIp

# Write to environment file
$dockerEnv = @("KILLRVIDEO_HOST_IP=$hostIp", "KILLRVIDEO_DOCKER_IP=$dockerVmIp")

# We have to use .NET to do this so it gets written as UTF-8 without the BOM
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($envFilePath, $dockerEnv, $Utf8NoBom)
Write-Host "Environment file written to $envFilePath"
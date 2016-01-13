import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { uploadVideo, clearVideoSelection } from 'actions/add-uploaded-video';

import { Alert, Row, Col, Button } from 'react-bootstrap';

import Input from 'components/shared/input';
import Icon from 'components/shared/icon';
import UploadFileSelector from './upload-file-selector';
import UploadProgress from './upload-progress';

// Component for when current browser doesn't support APIs needed for uploading a video
class AddUploadedVideoNotSupported extends Component {
  render() {
    return (
      <Alert bsStyle="danger">
        Sorry, uploading videos is not currently supported on this browser or device.
      </Alert>
    );
  }
}

// Inputs needed to add a new uploaded video
class AddUploadedVideo extends Component {
  doReset() {
    this.props.clearVideoSelection();
    this.props.resetForm();
  }
  
  doUpload() {
    this.props.uploadVideo(this.props.fields.uploadFile.value);
  }
  
  componentDidUpdate(prevProps) {
    // If we get a valid file, start the upload
    if (this.props.fields.uploadFile.valid && prevProps.fields.uploadFile.invalid) {
      this.doUpload();
    }
  }
    
  render() {
    const { fields: { uploadFile }, statusMessage, statusMessageStyle, percentComplete } = this.props;
    const fileName = uploadFile.valid ? uploadFile.value.name : '';
    
    const resetButton = (
      <Button type="reset" key="reset" title="Reset video selection" onClick={() => this.doReset()}>
        <Icon name="times" title="Reset video selection" />
      </Button>
    );
    
    const retryButton = (
      <Button type="button" key="retry" title="Retry upload" bsStyle="primary" onClick={() => this.doUpload()}>
        <Icon name="refresh" title="Retry upload" />
      </Button>
    );
    
    // If there is an error, include the retry button
    const buttonsAfter = statusMessageStyle === 'danger'
      ? [ resetButton, retryButton ]
      : [ resetButton ];
    
    return (
      <form>
        <Input {...uploadFile} wrapperClassName={uploadFile.valid ? 'hidden' : undefined}>
          <UploadFileSelector {...uploadFile} />
        </Input>
        <Row className={uploadFile.invalid ? 'hidden' : undefined}>
          <Col xs={12}>
            <Input type="text" label="Video File" value={fileName} buttonAfter={buttonsAfter} disabled />
          </Col>
        </Row>
        <Row className={uploadFile.invalid ? 'hidden' : undefined}>
          <Col xs={12}>
            <UploadProgress />
          </Col>
        </Row>
      </form>
    );
  }
}

// Prop validation
AddUploadedVideo.propTypes = {
  // Passed in from parent's redux-form state
  fields: PropTypes.object.isRequired,
  resetForm: PropTypes.func.isRequired,
  
  // Actions
  uploadVideo: PropTypes.func.isRequired,
  clearVideoSelection: PropTypes.func.isRequired
};

// Wrap component with redux form
const AddUploadedVideoForm = connect(undefined, { uploadVideo, clearVideoSelection })(AddUploadedVideo);

// Export the appropriate component based on whether upload is supported
const uploadSupported = global.File && global.FileReader && global.FileList && global.Blob;
const exportedComponent = uploadSupported ? AddUploadedVideoForm : AddUploadedVideoNotSupported;
export default exportedComponent;
import { RATINGS_SERVICE } from '../services/ratings';
import { uuidToString, stringToUuid } from '../utils/protobuf-conversions';
import { responsePicker, defaultResponsePicker } from '../utils/falcor-conversions';
import { prop } from 'ramda';
import { createGetPipeline } from '../utils/falcor-pipeline';
import * as P from '../utils/pipeline-functions';

const ratingsMap = {
  'count': prop('ratingsCount'),
  'total': prop('ratingsTotal')
};

const pickRatingsProps = responsePicker(ratingsMap);

// Routes handled by the ratings service
const routes = [
  {
    // Gets a videos ratings stats by video Id
    route: 'videosById[{keys:videoIds}].rating["count", "total"]',
    get: createGetPipeline(
      P.createRequestsFromPaths(2, path => ({ videoId: stringToUuid(path[1]) })),
      P.doRequests(RATINGS_SERVICE, (req, client) => { return client.getRatingAsync(req); }),
      P.mapProps(3, pickRatingsProps)
    )
  },
  {
    // Gets the rating value a user gave to a video 
    route: 'usersById[{keys:userIds}].ratings[{keys:videoIds}]["rating"]',
    get: createGetPipeline(
      P.createRequestsFromPaths(3, path => ({ videoId: stringToUuid(path[3]), userId: stringToUuid(path[1]) })),
      // TODO: Only allowed to see your own ratings
      P.doRequests(RATINGS_SERVICE, (req, client) => { return client.getUserRatingAsync(req); }),
      P.mapProps(4, defaultResponsePicker)
    )
  },
  {
    // Rates a video
    route: 'videosById[{keys:videoIds}].rating.rate',
    call(callPath, args) {
      // TODO: Need to update client to call .rating.rate instead of just .rate
      throw new Error('Not implemented');
    }
  }
];

export default routes;
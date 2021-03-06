/* eslint no-console: 0 */

const functions = require('firebase-functions');
const R = require('ramda');
const storage = require('@google-cloud/storage');
const serviceAccount = require('./firebase-adminsdk.json');

const writeToBucket = require('./utils/writeToBucket');

const INDEX_FILE_UPDATE_INTERVAL = 300 * 1000;
const PROJECT_ID = functions.config().project.id;
const BUCKET_NAME = functions.config().project.bucket;

const updatedAtKey = 'lastIndexFileUpdatedAt';

const gcs = storage({
  projectId: PROJECT_ID,
  credentials: serviceAccount
});

module.exports = function saveIndexToStorage(admin) {
  return functions.database.ref('index/{key}').onWrite((event) => {
    if (event.params.key === updatedAtKey) {
      return undefined;
    }

    const db = admin.database();
    const now = +new Date();

    console.log('[index file] try to update');

    return db.ref(`index/${updatedAtKey}`).transaction((time) => {
      if (time === null) {
        return 0;
      }
      if (now - time < INDEX_FILE_UPDATE_INTERVAL) {
        return undefined;
      }
      return now;
    })
    .then(({ committed }) => {
      if (!committed) {
        return undefined;
      }

      console.log('[index file] committed');

      return db.ref('index').once('value')
      .then((snapshot) => {
        const createKeysArray = R.pipe(
          R.dissoc(updatedAtKey),
          R.keys
        );

        const keys = createKeysArray(snapshot.val());
        const json = JSON.stringify(keys);
        const writeOptions = {
          metadata: {
            contentType: 'application/json'
          },
          gzip: true
        };

        return writeToBucket(gcs, BUCKET_NAME, 'index.json', json, writeOptions)
        .then(() => {
          console.log('[index file] write finish');
        }, (err) => {
          console.error('[index file] write error', err);
        });
      })
      .catch(err => console.error(err));
    });
  });
};

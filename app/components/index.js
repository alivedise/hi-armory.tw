/* eslint global-require: 0 */

export default (ngModule) => {
  const list = [
    require('./timeAgo'),
    require('./statusText'),
  ];
  list.forEach(({ default: configure }) => configure(ngModule));
};

const checkInternet = () => {
  require('dns').resolve('www.google.com', (err) => {
    if (err) {
      throw new Error('No connection');
    } else {
      console.log('Connected');
    }
  });
};

module.exports = { checkInternet };

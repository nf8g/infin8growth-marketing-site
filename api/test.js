module.exports = (req, res) => {
  res.json({
    message: "API is working!",
    time: new Date().toISOString()
  });
};

const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the "build" directory
app.use(express.static(path.join(__dirname, "build")));

// Catch-all route to redirect all requests to index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

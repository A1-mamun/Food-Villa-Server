const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000
const app = express();

// middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionsSuccessStatus: 200
}))
app.use(express.json())






app.get('/', (req, res) => {
    res.send('hello from food villa server')
})

app.listen(port, () => console.log(`server running on port ${port}`))
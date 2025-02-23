import express, { Request, Response } from 'express';

const app = express();

// Define route
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

// Start server
app.listen(3001, () => {
    console.log('Server running on http://localhost:3001');
});


import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import questionRoutes from './routes/questionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

dotenv.config();

connectDB();

const app = express();

const port = process.env.PORT || 4000;

app.use(cors({
    origin: process.env.FRONTEND_URL
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// The 'withAuth' middleware checks for a valid JWT in the Authorization header.
// The 'Clerk' object is attached to the request (req.clerk) for authorized requests.
app.use(ClerkExpressWithAuth());

app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('StackIt API is running...');
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});

export default app;


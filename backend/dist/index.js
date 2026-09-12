"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3000;
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const account_routes_1 = __importDefault(require("./routes/account.routes"));
const video_routes_1 = __importDefault(require("./routes/video.routes"));
const path_1 = __importDefault(require("path"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(process.env.STORAGE_PATH || path_1.default.join(process.cwd(), 'uploads')));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/accounts', account_routes_1.default);
app.use('/api/videos', video_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const worker_1 = require("./worker");
app.listen(PORT, () => {
    console.log(`Reels Manager Backend running on port ${PORT}`);
    (0, worker_1.startWorker)();
});

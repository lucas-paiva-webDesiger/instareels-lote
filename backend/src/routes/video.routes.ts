import { Router } from 'express';
import { uploadVideo, getVideos, updateVideo, deleteVideo, uploadCover } from '../controllers/video.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { upload } from '../services/storage.service';

const router = Router();

router.use(authenticate);

router.get('/', getVideos);
router.post('/upload', upload.single('video'), uploadVideo);
router.post('/:id/cover', upload.single('cover'), uploadCover);
router.put('/:id', updateVideo);
router.delete('/:id', deleteVideo);

export default router;

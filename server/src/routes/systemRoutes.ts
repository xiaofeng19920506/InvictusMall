import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /api/system/status:
 *   get:
 *     summary: Get system status and connected apps
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     apps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           url:
 *                             type: string
 *                           status:
 *                             type: string
 *                     server:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                         timestamp:
 *                           type: string
 */
router.get('/status', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({
    success: true,
    data: {
      apps: [
        {
          name: 'Backend API',
          url: 'http://localhost:3001',
          status: 'online',
          description: 'Express.js API Server'
        },
        {
          name: 'Frontend Store',
          url: 'http://localhost:3000',
          status: 'external',
          description: 'Next.js Customer Interface'
        },
        {
          name: 'Admin Dashboard',
          url: 'http://localhost:3003',
          status: 'external',
          description: 'React Admin Panel'
        }
      ],
      server: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      }
    }
  });
});

/**
 * @swagger
 * /api/system/apps:
 *   get:
 *     summary: Get information about all connected applications
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Apps information retrieved successfully
 */
router.get('/apps', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        name: 'Invictus Mall API',
        type: 'backend',
        url: 'http://localhost:3001',
        endpoints: {
          health: '/health',
          stores: '/api/stores',
          docs: '/api-docs'
        },
        status: 'online'
      },
      {
        name: 'Invictus Mall Store',
        type: 'frontend',
        url: 'http://localhost:3000',
        description: 'Customer shopping interface',
        features: ['Store browsing', 'Search', 'Categories'],
        status: 'external'
      },
      {
        name: 'Invictus Mall Admin',
        type: 'admin',
        url: 'http://localhost:3003',
        description: 'Store management dashboard',
        features: ['Store CRUD', 'Analytics', 'System monitoring'],
        status: 'external'
      }
    ]
  });
});

export default router;

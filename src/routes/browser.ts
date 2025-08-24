import { Router, Request, Response } from 'express';
import { BrowserPool } from '../services/BrowserPool';
import { QueueService } from '../services/QueueService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

export const browserRoutes = (browserPool: BrowserPool, queueService: QueueService): Router => {
  const router = Router();

  // Validation middleware
  const validateUrl = body('url')
    .isURL()
    .withMessage('Valid URL is required');

  const validateScreenshotOptions = [
    validateUrl,
    body('options.width').optional().isInt({ min: 100, max: 4000 }),
    body('options.height').optional().isInt({ min: 100, max: 4000 }),
    body('options.fullPage').optional().isBoolean(),
    body('options.format').optional().isIn(['png', 'jpeg']),
    body('options.quality').optional().isInt({ min: 1, max: 100 }),
  ];

  const validatePdfOptions = [
    validateUrl,
    body('options.format').optional().isIn(['A4', 'A3', 'A2', 'A1', 'A0', 'Letter', 'Legal', 'Tabloid', 'Ledger']),
    body('options.landscape').optional().isBoolean(),
    body('options.printBackground').optional().isBoolean(),
  ];

  const validateScrapeOptions = [
    validateUrl,
    body('options.selector').optional().isString(),
    body('options.waitFor').optional().isInt({ min: 0, max: 60000 }),
  ];

  const validateEvaluateOptions = [
    body('code').isString().notEmpty().withMessage('JavaScript code is required'),
    body('url').optional().isURL(),
  ];

  // Helper function to handle validation errors
  const handleValidationErrors = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    return next();
  };

  // Screenshot endpoint
  router.post('/screenshot', 
    validateScreenshotOptions, 
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { url, options = {} } = req.body;
      const startTime = Date.now();

      try {
        const session = await browserPool.createSession();
        const page = await browserPool.createPage(session.id);

        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        // Wait for any additional loading if specified
        if (options.waitFor) {
          await new Promise(resolve => setTimeout(resolve, options.waitFor));
        }

        const screenshotOptions: any = {
          type: options.format || 'png',
          fullPage: options.fullPage || false,
        };

        if (options.width && options.height) {
          await page.setViewport({ 
            width: options.width, 
            height: options.height 
          });
        }

        if (options.quality && options.format === 'jpeg') {
          screenshotOptions.quality = options.quality;
        }

        const screenshot = await page.screenshot(screenshotOptions);
        
        await browserPool.closeSession(session.id);

        const executionTime = Date.now() - startTime;
        
        res.set({
          'Content-Type': `image/${options.format || 'png'}`,
          'Content-Length': screenshot.length.toString(),
          'X-Execution-Time': executionTime.toString()
        });

        res.send(screenshot);

        logger.info(`Screenshot completed for ${url} in ${executionTime}ms`);

      } catch (error) {
        logger.error('Screenshot error:', error);
        throw createError('Failed to take screenshot', 500);
      }
    })
  );

  // PDF generation endpoint
  router.post('/pdf',
    validatePdfOptions,
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { url, options = {} } = req.body;
      const startTime = Date.now();

      try {
        const session = await browserPool.createSession();
        const page = await browserPool.createPage(session.id);

        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        const pdfOptions: any = {
          format: options.format || 'A4',
          landscape: options.landscape || false,
          printBackground: options.printBackground !== false,
          margin: {
            top: '1cm',
            right: '1cm',
            bottom: '1cm',
            left: '1cm'
          }
        };

        const pdf = await page.pdf(pdfOptions);
        
        await browserPool.closeSession(session.id);

        const executionTime = Date.now() - startTime;

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Length': pdf.length.toString(),
          'Content-Disposition': 'attachment; filename="page.pdf"',
          'X-Execution-Time': executionTime.toString()
        });

        res.send(pdf);

        logger.info(`PDF generated for ${url} in ${executionTime}ms`);

      } catch (error) {
        logger.error('PDF generation error:', error);
        throw createError('Failed to generate PDF', 500);
      }
    })
  );

  // Web scraping endpoint
  router.post('/scrape',
    validateScrapeOptions,
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { url, options = {} } = req.body;
      const startTime = Date.now();

      try {
        const session = await browserPool.createSession();
        const page = await browserPool.createPage(session.id);

        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        if (options.waitFor) {
          await new Promise(resolve => setTimeout(resolve, options.waitFor));
        }

        let data: any;

        if (options.selector) {
          // Extract specific elements
          data = await page.evaluate((selector) => {
            const elements = document.querySelectorAll(selector);
            return Array.from(elements).map(el => ({
              text: (el as Element).textContent?.trim(),
              html: (el as Element).innerHTML,
              attributes: Object.fromEntries(
                Array.from((el as Element).attributes).map((attr: Attr) => [attr.name, attr.value])
              )
            }));
          }, options.selector);
        } else {
          // Extract page metadata and content
          data = await page.evaluate(() => {
            const getMetaContent = (name: string) => {
              const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
              return meta ? meta.getAttribute('content') : null;
            };

            return {
              title: document.title,
              description: getMetaContent('description'),
              keywords: getMetaContent('keywords'),
              url: window.location.href,
              text: document.body.innerText,
              links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
                text: a.textContent?.trim(),
                href: (a as HTMLAnchorElement).href
              })),
              images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
                src: (img as HTMLImageElement).src,
                alt: (img as HTMLImageElement).alt
              }))
            };
          });
        }

        await browserPool.closeSession(session.id);

        const executionTime = Date.now() - startTime;

        res.json({
          status: 'success',
          data,
          executionTime,
          url
        });

        logger.info(`Scraping completed for ${url} in ${executionTime}ms`);

      } catch (error) {
        logger.error('Scraping error:', error);
        throw createError('Failed to scrape page', 500);
      }
    })
  );

  // JavaScript evaluation endpoint
  router.post('/evaluate',
    validateEvaluateOptions,
    handleValidationErrors,
    asyncHandler(async (req: Request, res: Response) => {
      const { code, url } = req.body;
      const startTime = Date.now();

      try {
        const session = await browserPool.createSession();
        const page = await browserPool.createPage(session.id);

        if (url) {
          await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
        }

        const result = await page.evaluate(code);
        
        await browserPool.closeSession(session.id);

        const executionTime = Date.now() - startTime;

        res.json({
          status: 'success',
          result,
          executionTime,
          url: url || null
        });

        logger.info(`JavaScript evaluation completed in ${executionTime}ms`);

      } catch (error) {
        logger.error('JavaScript evaluation error:', error);
        throw createError('Failed to evaluate JavaScript', 500);
      }
    })
  );

  // Browser pool status
  router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    const poolStats = browserPool.getStats();
    const queueStats = await queueService.getQueueStats();

    res.json({
      status: 'ok',
      browserPool: poolStats,
      queue: queueStats,
      timestamp: new Date().toISOString()
    });
  }));

  return router;
};

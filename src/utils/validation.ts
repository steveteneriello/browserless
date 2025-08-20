import Joi from 'joi';

export const screenshotSchema = Joi.object({
  url: Joi.string().uri().required().max(2048),
  options: Joi.object({
    width: Joi.number().integer().min(100).max(4000).default(1440),
    height: Joi.number().integer().min(100).max(4000).default(2400),
    fullPage: Joi.boolean().default(false),
    format: Joi.string().valid('png', 'jpeg').default('png'),
    quality: Joi.number().integer().min(1).max(100).default(80),
    waitFor: Joi.number().integer().min(0).max(60000).default(0),
    timeout: Joi.number().integer().min(1000).max(80000).default(30000),
    deviceScaleFactor: Joi.number().min(0.1).max(3).default(1),
    clip: Joi.object({
      x: Joi.number().integer().min(0),
      y: Joi.number().integer().min(0),
      width: Joi.number().integer().min(1),
      height: Joi.number().integer().min(1)
    }).optional()
  }).default({})
});

export const pdfSchema = Joi.object({
  url: Joi.string().uri().required().max(2048),
  options: Joi.object({
    format: Joi.string().valid('A4', 'A3', 'A2', 'A1', 'A0', 'Letter', 'Legal', 'Tabloid', 'Ledger').default('A4'),
    landscape: Joi.boolean().default(false),
    printBackground: Joi.boolean().default(true),
    scale: Joi.number().min(0.1).max(2).default(1),
    timeout: Joi.number().integer().min(1000).max(80000).default(30000),
    margin: Joi.object({
      top: Joi.string().default('1cm'),
      right: Joi.string().default('1cm'),
      bottom: Joi.string().default('1cm'),
      left: Joi.string().default('1cm')
    }).default({})
  }).default({})
});

export const scrapeSchema = Joi.object({
  url: Joi.string().uri().required().max(2048),
  options: Joi.object({
    selector: Joi.string().max(500).optional(),
    waitFor: Joi.number().integer().min(0).max(60000).default(0),
    timeout: Joi.number().integer().min(1000).max(80000).default(30000),
    extractText: Joi.boolean().default(true),
    extractLinks: Joi.boolean().default(true),
    extractImages: Joi.boolean().default(true),
    extractMetadata: Joi.boolean().default(true)
  }).default({})
});

export const evaluateSchema = Joi.object({
  code: Joi.string().required().max(10000),
  url: Joi.string().uri().optional().max(2048),
  options: Joi.object({
    timeout: Joi.number().integer().min(1000).max(30000).default(10000),
    args: Joi.array().items(Joi.any()).max(10).default([])
  }).default({})
});

export const urlValidation = {
  isAllowed: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // Check blocked domains
      const blockedDomains = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '10.',
        '172.',
        '192.168.',
        'internal',
        'local'
      ];
      
      const hostname = urlObj.hostname.toLowerCase();
      return !blockedDomains.some(blocked => 
        hostname.includes(blocked) || hostname.endsWith(`.${blocked}`)
      );
      
    } catch {
      return false;
    }
  }
};

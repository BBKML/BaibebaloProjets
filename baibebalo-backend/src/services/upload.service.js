const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;
const config = require('../config');
const logger = require('../utils/logger');

// Configuration AWS S3 Client (v3)
// Ne créer le client que si S3 est configuré
let s3Client = null;
if (config.upload?.s3?.bucket && config.upload?.s3?.accessKeyId && config.upload?.s3?.secretAccessKey) {
  try {
    s3Client = new S3Client({
      region: config.upload?.s3?.region || 'eu-west-1',
      credentials: {
        accessKeyId: config.upload?.s3?.accessKeyId,
        secretAccessKey: config.upload?.s3?.secretAccessKey,
      },
    });
    logger.info('Client S3 initialisé avec succès');
  } catch (error) {
    logger.warn('Erreur initialisation client S3:', error.message);
  }
} else {
  logger.warn('S3 non configuré - les uploads S3 ne fonctionneront pas');
}

// Configuration Multer pour upload en mémoire
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Types de fichiers autorisés
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  const isImage = allowedImageTypes.test(extname.slice(1)) && 
                  allowedImageTypes.test(mimetype.split('/')[1]);
  const isDoc = allowedDocTypes.test(extname.slice(1)) && 
                mimetype === 'application/pdf';

  if (isImage || isDoc) {
    return cb(null, true);
  }
  
  cb(new Error('Type de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WEBP, PDF'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload?.maxSize || 5 * 1024 * 1024, // 5MB par défaut
    files: 1, // Un seul fichier à la fois
  },
  fileFilter,
});

class UploadService {
  /**
   * Upload un fichier localement (pour développement)
   */
  async uploadToLocal(file, folder = 'general') {
    try {
      // Vérifier que le fichier a les propriétés nécessaires
      if (!file || !file.buffer) {
        throw new Error('Fichier invalide: buffer manquant');
      }
      
      if (!file.originalname) {
        throw new Error('Fichier invalide: originalname manquant');
      }

      const uploadDir = config.upload?.local?.uploadDir || './uploads';
      const publicPath = config.upload?.local?.publicPath || '/uploads';
      
      // Résoudre le chemin absolu
      const absoluteUploadDir = path.resolve(uploadDir);
      
      // Créer le dossier s'il n'existe pas
      const folderPath = path.join(absoluteUploadDir, folder);
      await fs.mkdir(folderPath, { recursive: true });
      
      // Générer un nom de fichier unique
      const ext = path.extname(file.originalname) || '.jpg';
      const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const filePath = path.join(folderPath, fileName);
      
      // Écrire le fichier
      await fs.writeFile(filePath, file.buffer);
      
      // Construire l'URL publique
      // Utiliser l'URL de base de l'API depuis la config, ou construire depuis le port
      let apiBaseUrl = config.urls?.apiBase;
      if (!apiBaseUrl || apiBaseUrl.includes('localhost:3000')) {
        // Si pas configuré ou utilise le port par défaut, utiliser le port actuel
        const port = config.port || 5000;
        apiBaseUrl = `http://localhost:${port}`;
      }
      // S'assurer que l'URL ne se termine pas par un slash
      apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
      const url = `${apiBaseUrl}${publicPath}/${folder}/${fileName}`;
      
      logger.info(`Fichier uploadé localement: ${filePath}`);
      logger.info(`URL publique: ${url}`);
      logger.info(`URL accessible via: GET ${url}`);
      
      return {
        success: true,
        url: url,
        key: `${folder}/${fileName}`,
        path: filePath,
      };
    } catch (error) {
      logger.error('Erreur upload local:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        file: file ? {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer,
        } : 'No file',
      });
      throw new Error(`Erreur lors de l'upload local: ${error.message}`);
    }
  }

  /**
   * Supprimer un fichier local
   */
  async deleteFromLocal(key) {
    try {
      const uploadDir = config.upload?.local?.uploadDir || './uploads';
      const filePath = path.join(uploadDir, key);
      
      await fs.unlink(filePath);
      
      logger.info(`Fichier supprimé localement: ${filePath}`);
      
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Fichier déjà supprimé
        return { success: true };
      }
      logger.error('Erreur suppression locale:', error);
      throw new Error(`Erreur lors de la suppression locale: ${error.message}`);
    }
  }

  /**
   * Upload un fichier vers S3
   */
  async uploadToS3(file, folder = 'general') {
    try {
      if (!s3Client) {
        throw new Error('Client S3 non initialisé. Vérifiez la configuration AWS.');
      }

      const bucket = config.upload?.s3?.bucket;
      
      if (!bucket) {
        throw new Error('Bucket S3 non configuré. Vérifiez les variables d\'environnement AWS_S3_BUCKET.');
      }

      const fileName = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
      const region = config.upload?.s3?.region || 'eu-west-1';

      // Vérifier que les credentials sont configurées
      if (!config.upload?.s3?.accessKeyId || !config.upload?.s3?.secretAccessKey) {
        throw new Error('Credentials AWS non configurées. Vérifiez AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY.');
      }

      // Utiliser Upload pour gérer les uploads de manière optimale
      // Note: ACL 'public-read' peut ne pas être supporté dans certaines régions AWS
      // On utilise PutObjectCommand directement pour plus de contrôle
      const uploadParams = {
        Bucket: bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Ne pas utiliser ACL si le bucket a des politiques de bucket
        // ACL: 'public-read', // Commenté car peut causer des erreurs
      };

      const upload = new Upload({
        client: s3Client,
        params: uploadParams,
        leavePartsOnError: false,
      });

      const result = await upload.done();
      
      // Construire l'URL publique
      // Si le bucket utilise un domaine personnalisé, il faudra l'ajuster
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
      
      logger.info(`Fichier uploadé sur S3: ${url}`);
      
      return {
        success: true,
        url: url,
        key: result.Key || fileName,
      };
    } catch (error) {
      logger.error('Erreur upload S3:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        bucket: config.upload?.s3?.bucket,
        region: config.upload?.s3?.region,
      });
      
      // Retourner l'erreur originale avec plus de détails
      const errorMessage = error.message || 'Erreur lors de l\'upload du fichier';
      
      throw new Error(`Erreur lors de l'upload du fichier: ${errorMessage}${error.code ? ` (${error.code})` : ''}`);
    }
  }

  /**
   * Upload plusieurs fichiers
   */
  async uploadMultipleToS3(files, folder = 'general') {
    try {
      const uploadPromises = files.map(file => this.uploadToS3(file, folder));
      const results = await Promise.all(uploadPromises);
      
      return {
        success: true,
        files: results.map(r => ({ url: r.url, key: r.key })),
      };
    } catch (error) {
      logger.error('Erreur upload multiple S3:', error);
      throw error;
    }
  }

  /**
   * Supprimer un fichier de S3
   */
  async deleteFromS3(key) {
    try {
      if (!s3Client) {
        throw new Error('Client S3 non initialisé');
      }

      const bucket = config.upload?.s3?.bucket;
      if (!bucket) {
        throw new Error('Bucket S3 non configuré');
      }

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3Client.send(command);
      
      logger.info(`Fichier supprimé de S3: ${key}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Erreur suppression S3:', error);
      throw new Error('Erreur lors de la suppression du fichier');
    }
  }

  /**
   * Upload vers Cloudinary (alternative)
   */
  async uploadToCloudinary(file, folder = 'general') {
    try {
      const cloudinary = require('cloudinary').v2;
      
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
      });

      // Upload en base64
      const base64File = file.buffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64File}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: `baibebalo/${folder}`,
        resource_type: 'auto',
      });

      logger.info(`Fichier uploadé sur Cloudinary: ${result.secure_url}`);

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      logger.error('Erreur upload Cloudinary:', error);
      throw new Error('Erreur lors de l\'upload du fichier');
    }
  }

  /**
   * Supprimer de Cloudinary
   */
  async deleteFromCloudinary(publicId) {
    try {
      const cloudinary = require('cloudinary').v2;
      
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
      });

      await cloudinary.uploader.destroy(publicId);
      
      logger.info(`Fichier supprimé de Cloudinary: ${publicId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Erreur suppression Cloudinary:', error);
      throw new Error('Erreur lors de la suppression du fichier');
    }
  }

  /**
   * Redimensionner une image (avec Sharp)
   */
  async resizeImage(file, width, height, quality = 80) {
    try {
      const sharp = require('sharp');
      
      const resizedBuffer = await sharp(file.buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality })
        .toBuffer();

      return {
        ...file,
        buffer: resizedBuffer,
        size: resizedBuffer.length,
      };
    } catch (error) {
      logger.error('Erreur redimensionnement image:', error);
      throw new Error('Erreur lors du redimensionnement de l\'image');
    }
  }

  /**
   * Générer plusieurs tailles d'une image
   */
  async generateThumbnails(file) {
    try {
      const sizes = {
        thumb: { width: 150, height: 150 },
        small: { width: 300, height: 300 },
        medium: { width: 600, height: 600 },
        large: { width: 1200, height: 1200 },
      };

      const thumbnails = {};

      for (const [name, size] of Object.entries(sizes)) {
        const resized = await this.resizeImage(file, size.width, size.height);
        const uploaded = await this.uploadToS3(resized, `thumbnails/${name}`);
        thumbnails[name] = uploaded.url;
      }

      // Upload original aussi
      const original = await this.uploadToS3(file, 'originals');
      thumbnails.original = original.url;

      return {
        success: true,
        thumbnails,
      };
    } catch (error) {
      logger.error('Erreur génération thumbnails:', error);
      throw error;
    }
  }
}

// Middleware Multer configuré
const uploadMiddleware = {
  single: (fieldName) => upload.single(fieldName),
  multiple: (fieldName, maxCount = 10) => upload.array(fieldName, maxCount),
  fields: (fields) => upload.fields(fields),
};

module.exports = {
  uploadService: new UploadService(),
  uploadMiddleware,
};
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import prisma from '../config/database';
import fs from 'fs';
import path from 'path';

interface AuthRequest extends Request {
  user?: any;
}

export const createResource = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category } = req.body;
    const uploadedBy = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        description,
        category,
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: resource,
      message: 'Resource uploaded successfully'
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload resource'
    });
  }
};

export const getResources = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    
    const where: any = {};
    if (category) where.category = category;

    const resources = await prisma.resource.findMany({
      where,
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources'
    });
  }
};

export const updateResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const resource = await prisma.resource.findUnique({
      where: { id }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if user is the uploader or admin
    if (resource.uploadedBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this resource'
      });
    }

    let updateData: any = { title, description, category };

    // If new file is uploaded, update file info and delete old file
    if (req.file) {
      // Delete old file
      const oldFilePath = path.join(process.cwd(), 'uploads', path.basename(resource.fileUrl));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      updateData = {
        ...updateData,
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size
      };
    }

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: updateData,
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: updatedResource,
      message: 'Resource updated successfully'
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resource'
    });
  }
};

export const getResourceById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    console.error('Get resource by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource'
    });
  }
};

export const deleteResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if user is the uploader or admin
    if (resource.uploadedBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this resource'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), 'uploads', path.basename(resource.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.resource.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource'
    });
  }
};

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.resource.findMany({
      select: { category: true },
      distinct: ['category']
    });

    res.json({
      success: true,
      data: categories.map((c: { category: any; }) => c.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};
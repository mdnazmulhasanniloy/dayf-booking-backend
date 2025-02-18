// eslint-disable-next-line @typescript-eslint/no-var-requires
// import fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
// import path from "path";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

function capitalizeFirstLetter(text) {
  const [first = '', ...rest] = text;
  return [first.toUpperCase(), ...rest].join('');
}

// Function to create the folder and files
function createFolderAndFiles(parentFolderPath, folderName) {
  const folderPath = path.join(parentFolderPath, folderName);
  fs.mkdirSync(folderPath);

  const files = [
    `${folderName}.constants.ts`,
    `${folderName}.controller.ts`,
    `${folderName}.interface.ts`,
    `${folderName}.models.ts`,
    `${folderName}.route.ts`,
    `${folderName}.service.ts`,
    `${folderName}.utils.ts`,
    `${folderName}.validation.ts`,
  ];

  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    let content = '';

    if (file === `${folderName}.service.ts`) {
      content = `
import httpStatus from 'http-status';
import { I${capitalizeFirstLetter(folderName)} } from './${folderName}.interface';
import ${capitalizeFirstLetter(folderName)} from './${folderName}.models';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/AppError';

const create${capitalizeFirstLetter(folderName)} = async (payload: I${capitalizeFirstLetter(folderName)}) => {
  const result = await ${capitalizeFirstLetter(folderName)}.create(payload);
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create ${folderName}');
  }
  return result;
};

const getAll${capitalizeFirstLetter(folderName)} = async (query: Record<string, any>) => {
query["isDeleted"] = false;
  const ${folderName}Model = new QueryBuilder(${capitalizeFirstLetter(folderName)}.find(), query)
    .search([""])
    .filter()
    .paginate()
    .sort()
    .fields();

  const data = await ${folderName}Model.modelQuery;
  const meta = await ${folderName}Model.countTotal();

  return {
    data,
    meta,
  };
};

const get${capitalizeFirstLetter(folderName)}ById = async (id: string) => {
  const result = await ${capitalizeFirstLetter(folderName)}.findById(id);
  if (!result || result?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST,'${capitalizeFirstLetter(folderName)} not found!');
  }
  return result;
};

const update${capitalizeFirstLetter(folderName)} = async (id: string, payload: Partial<I${capitalizeFirstLetter(folderName)}>) => {
  const result = await ${capitalizeFirstLetter(folderName)}.findByIdAndUpdate(id, payload, { new: true });
  if (!result) {
   throw new AppError(httpStatus.BAD_REQUEST,'Failed to update ${capitalizeFirstLetter(folderName)}');
  }
  return result;
};

const delete${capitalizeFirstLetter(folderName)} = async (id: string) => {
  const result = await ${capitalizeFirstLetter(folderName)}.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete ${folderName}');
  }
  return result;
};

export const ${folderName}Service = {
  create${capitalizeFirstLetter(folderName)},
  getAll${capitalizeFirstLetter(folderName)},
  get${capitalizeFirstLetter(folderName)}ById,
  update${capitalizeFirstLetter(folderName)},
  delete${capitalizeFirstLetter(folderName)},
};`;
    } else if (file === `${folderName}.controller.ts`) {
      content = `
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';  
import { ${folderName}Service } from './${folderName}.service';
import sendResponse from '../../utils/sendResponse';
import { storeFile } from '../../utils/fileHelper';
import { uploadToS3 } from '../../utils/s3';

const create${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {
 const result = await ${folderName}Service.create${capitalizeFirstLetter(folderName)}(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} created successfully',
    data: result,
  });

});

const getAll${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {

 const result = await ${folderName}Service.getAll${capitalizeFirstLetter(folderName)}(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All ${folderName} fetched successfully',
    data: result,
  });

});

const get${capitalizeFirstLetter(folderName)}ById = catchAsync(async (req: Request, res: Response) => {
 const result = await ${folderName}Service.get${capitalizeFirstLetter(folderName)}ById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} fetched successfully',
    data: result,
  });

});
const update${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {
const result = await ${folderName}Service.update${capitalizeFirstLetter(folderName)}(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} updated successfully',
    data: result,
  });

});


const delete${capitalizeFirstLetter(folderName)} = catchAsync(async (req: Request, res: Response) => {
 const result = await ${folderName}Service.delete${capitalizeFirstLetter(folderName)}(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: '${capitalizeFirstLetter(folderName)} deleted successfully',
    data: result,
  });

});

export const ${folderName}Controller = {
  create${capitalizeFirstLetter(folderName)},
  getAll${capitalizeFirstLetter(folderName)},
  get${capitalizeFirstLetter(folderName)}ById,
  update${capitalizeFirstLetter(folderName)},
  delete${capitalizeFirstLetter(folderName)},
};`;
    } else if (file === `${folderName}.route.ts`) {
      content = `
import { Router } from 'express';
import { ${folderName}Controller } from './${folderName}.controller';

const router = Router();

router.post('/', ${folderName}Controller.create${capitalizeFirstLetter(folderName)});
router.patch('/:id', ${folderName}Controller.update${capitalizeFirstLetter(folderName)});
router.delete('/:id', ${folderName}Controller.delete${capitalizeFirstLetter(folderName)});
router.get('/:id', ${folderName}Controller.get${capitalizeFirstLetter(folderName)}ById);
router.get('/', ${folderName}Controller.getAll${capitalizeFirstLetter(folderName)});

export const ${folderName}Routes = router;`;
    } else if (file === `${folderName}.interface.ts`) {
      content = `
import { Model } from 'mongoose';

export interface I${capitalizeFirstLetter(folderName)} {}

export type I${capitalizeFirstLetter(folderName)}Modules = Model<I${capitalizeFirstLetter(folderName)}, Record<string, unknown>>;`;
    } else if (file === `${folderName}.models.ts`) {
      content = `
import { model, Schema } from 'mongoose';
import { I${capitalizeFirstLetter(folderName)}, I${capitalizeFirstLetter(folderName)}Modules } from './${folderName}.interface';

const ${folderName}Schema = new Schema<I${capitalizeFirstLetter(folderName)}>(
  {
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

 

const ${capitalizeFirstLetter(folderName)} = model<I${capitalizeFirstLetter(folderName)}, I${capitalizeFirstLetter(folderName)}Modules>(
  '${capitalizeFirstLetter(folderName)}',
  ${folderName}Schema
);
export default ${capitalizeFirstLetter(folderName)};`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
  });

  console.log(`Folder "${folderName}" and files created successfully.`);
}

// Prompting the user for the parent folder path and folder name
// eslint-disable-next-line @typescript-eslint/no-var-requires
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question('Enter parent folder path: ', parentFolderPath => {
  readline.question('Enter folder name: ', folderName => {
    createFolderAndFiles(parentFolderPath, folderName);
    readline.close();
  });
});

import initialDataRaw from './initialData.json';
import { InitialDataset } from '../types';

export const initialData: InitialDataset = initialDataRaw as unknown as InitialDataset;

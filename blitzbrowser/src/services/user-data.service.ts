import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import * as fs from 'fs';
import * as fsPromise from 'fs/promises';
import * as zlib from 'zlib';
import * as tar from 'tar';
import LimitStream from "src/transforms/limit-stream";

@Injectable()
export class UserDataService {

    private readonly logger = new Logger(UserDataService.name);

    constructor(
        private readonly s3_client: S3Client,
    ) { }

    async downloadUserData(id: string, user_data_folder: string) {
        try {
            const tar_file = `/tmp/${crypto.randomUUID()}`;
            const response = await this.s3_client.send(new GetObjectCommand({
                Bucket: process.env.S3_USER_DATA_BUCKET,
                Key: id,
            }));

            await fsPromise.writeFile(tar_file, await response.Body.transformToByteArray());
            await this.untarUserDataFolder(tar_file, user_data_folder);
            await fsPromise.rm(tar_file);

            this.logger.log(`Downloaded user data ${id} folder:${user_data_folder}`);
        } catch (e) {
            if (e.Code === 'NoSuchKey') {
                return;
            }

            throw e;
        }
    }

    async uploadUserData(id: string, user_data_folder: string) {
        const tar_file = await this.tarUserDataFolder(user_data_folder);

        await this.s3_client.send(new PutObjectCommand({
            Bucket: process.env.S3_USER_DATA_BUCKET,
            Key: id,
            Body: await fsPromise.readFile(tar_file)
        }));

        await fsPromise.rm(tar_file);

        this.logger.log(`Uploaded user data ${id} folder:${user_data_folder}`);
    }

    /**
     * 
     * @param user_data_folder The user data folder to tar
     * @returns The tar file path
     */
    protected async tarUserDataFolder(user_data_folder: string): Promise<string> {
        const tar_file = `${crypto.randomUUID()}.tar.gz`;

        await this.#cleanUserDataFolder(user_data_folder);

        await tar.create({
            gzip: true,
            file: tar_file,
            cwd: user_data_folder
        }, ['.']);

        return tar_file;
    }

    protected async untarUserDataFolder(tar_file: string, user_data_folder: string) {
        await new Promise((res, rej) => {
            fs.createReadStream(tar_file)
                .pipe(zlib.createGunzip())
                .pipe(new LimitStream(104857600)) // Max 100 MB decompression
                .pipe(tar.extract({ cwd: user_data_folder }))
                .on('finish', () => {
                    res(undefined);
                })
                .on('error', (err) => {
                    rej(err);
                });
        });
        await this.#cleanUserDataFolder(user_data_folder);
    }

    /**
     * Remove the undesired files(locks, logs, metrics) and folders from the user data
     * @param user_data_folder 
     */
    async #cleanUserDataFolder(user_data_folder: string) {
        await Promise.allSettled([
            fsPromise.rm(`${user_data_folder}/Default/Sessions`, { recursive: true, force: true }),
            fsPromise.rm(`${user_data_folder}/SingletonLock`, { force: true }),
            fsPromise.rm(`${user_data_folder}/SingletonCookie`, { force: true }),
            fsPromise.rm(`${user_data_folder}/SingletonSocket`, { force: true }),
        ]);
    }

}
import { Transform, TransformCallback, TransformOptions } from 'stream';

/**
 * A Transform stream that enforces a maximum size limit on the data passing through.
 * @param {number} limitInBytes - The maximum allowed uncompressed size.
 */
export default class LimitStream extends Transform {

    private bytes_processed = 0;

    constructor(
        private readonly byte_limit: number,
        options?: TransformOptions
    ) {
        super(options);
    }

    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
        this.bytes_processed += chunk.length;

        if (this.bytes_processed > this.byte_limit) {
            const error = new Error(`Decompression limit exceeded. Max size: ${this.byte_limit} bytes`);
            this.destroy(error);
            return callback(error);
        }

        this.push(chunk);
        callback();
    }
}
declare module "protoc" {
    import {ExecFileOptions} from "child_process";

    export function protoc(args: string[], options: ExecFileOptions, callback: (error: Error, stdout: string | Buffer, stderr: string | Buffer) => void): void;
}
import { Module } from "@nestjs/common";
import { CallController } from "./controllers";
import { CallService } from "./services";

@Module({
    imports: [],
    providers: [CallService],
    controllers: [CallController],
    exports: [],
})

export class CallModule { }
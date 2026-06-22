import { Module } from "@nestjs/common";
import { AIService } from "./services";
import { AIController } from "./controllers";

@Module({
    imports: [],
    providers: [AIService],
    controllers: [AIController],
    exports: [],
})

export class AIModule { }
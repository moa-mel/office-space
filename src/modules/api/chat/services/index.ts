import { PrismaService } from "@/modules/core/prisma/services";

export class ChatService {
    constructor(
        private prisma: PrismaService,
    ) { }
    
}
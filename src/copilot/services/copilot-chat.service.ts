import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { CopilotConversation } from '../../database/entities/copilot/copilot-conversation.entity';
import { CopilotMessage } from '../../database/entities/copilot/copilot-message.entity';
import { CopilotLlmService } from './copilot-llm.service';
import { CopilotToolsService, COPILOT_TOOLS } from './copilot-tools.service';
import { CopilotConfigService } from './copilot-config.service';

const MAX_TOOL_ITERATIONS = 5;

@Injectable()
export class CopilotChatService {
  private readonly logger = new Logger(CopilotChatService.name);

  constructor(
    @InjectRepository(CopilotConversation)
    private readonly conversationRepo: Repository<CopilotConversation>,
    @InjectRepository(CopilotMessage)
    private readonly messageRepo: Repository<CopilotMessage>,
    private readonly llm: CopilotLlmService,
    private readonly tools: CopilotToolsService,
    private readonly copilotConfig: CopilotConfigService,
  ) {}

  async createConversation(
    launchId: string,
    userId: string | undefined,
    title?: string,
  ): Promise<CopilotConversation> {
    const conversation = this.conversationRepo.create({
      launch_id: launchId,
      user_id: userId,
      title: title ?? null,
    });
    return this.conversationRepo.save(conversation);
  }

  async listConversations(launchId?: string): Promise<CopilotConversation[]> {
    return this.conversationRepo.find({
      where: launchId ? { launch_id: launchId } : {},
      order: { updated_at: 'DESC' },
    });
  }

  async listMessages(conversationId: string): Promise<CopilotMessage[]> {
    return this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
    });
  }

  async sendMessage(
    conversationId: string,
    content: string,
  ): Promise<CopilotMessage> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        conversation_id: conversationId,
        role: 'user',
        content,
      }),
    );

    const history = await this.listMessages(conversationId);
    const config = await this.copilotConfig.getConfig(conversation.launch_id);

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.llm.buildSystemPrompt(config?.extra_context),
      },
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map(
          (m): ChatCompletionMessageParam => ({
            role: m.role as 'user' | 'assistant',
            content: m.content ?? '',
          }),
        ),
    ];

    const toolCallLog: Record<string, unknown>[] = [];
    let finalContent: string | null = null;

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const assistantTurn = await this.llm.complete(messages, COPILOT_TOOLS);

      if (!assistantTurn.toolCalls || assistantTurn.toolCalls.length === 0) {
        finalContent = assistantTurn.content;
        break;
      }

      messages.push({
        role: 'assistant',
        content: assistantTurn.content,
        tool_calls: assistantTurn.toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: call.arguments },
        })),
      });

      for (const call of assistantTurn.toolCalls) {
        const result = await this.tools.dispatch(
          call.name,
          call.arguments,
          conversation.launch_id,
        );
        toolCallLog.push({ name: call.name, arguments: call.arguments });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (finalContent === null) {
      this.logger.warn(
        `Conversa ${conversationId} atingiu limite de ${MAX_TOOL_ITERATIONS} chamadas de tool sem resposta final.`,
      );
      finalContent =
        'Não consegui concluir a análise com os dados disponíveis agora. Tente reformular a pergunta.';
    }

    const assistantMessage = await this.messageRepo.save(
      this.messageRepo.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: finalContent,
        tool_calls: toolCallLog.length > 0 ? toolCallLog : null,
      }),
    );

    await this.conversationRepo.save(conversation);

    return assistantMessage;
  }
}

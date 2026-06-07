import { CosmosClient, Container } from "@azure/cosmos";
import fs from "fs";
import path from "path";
import {
  UserDoc,
  ConversationDoc,
  MessageDoc,
  HandoffDoc,
  PolicyEmbeddingDoc,
  CacheUniversityDataDoc,
} from "./types";

interface MockDBStore {
  users: UserDoc[];
  conversations: ConversationDoc[];
  messages: MessageDoc[];
  handoffs: HandoffDoc[];
  policyEmbeddings: PolicyEmbeddingDoc[];
  cacheUniversityData: CacheUniversityDataDoc[];
}

interface CosmosContainerConfig {
  id: string;
  defaultTtl?: number;
}

class CosmosDBService {
  private client: CosmosClient | null = null;
  private dbId: string = process.env.COSMOS_DATABASE_ID || "archon-db";
  private isMockMode: boolean = true;
  private mockFilePath: string;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.mockFilePath = path.join(process.cwd(), "src", "lib", "db", "mock-db.json");

    const connectionString = process.env.COSMOS_CONNECTION_STRING?.trim();
    const endpoint = process.env.COSMOS_ENDPOINT?.trim();
    const key = process.env.COSMOS_KEY?.trim();

    const canUseConnectionString = Boolean(connectionString);
    const canUseEndpointKey = Boolean(endpoint && key);

    if (canUseConnectionString || canUseEndpointKey) {
      const initAttempts: Array<() => CosmosClient> = [];

      if (canUseConnectionString) {
        initAttempts.push(() => new CosmosClient(connectionString as string));
      }

      if (canUseEndpointKey) {
        initAttempts.push(() => new CosmosClient({ endpoint: endpoint as string, key: key as string }));
      }

      for (const createClient of initAttempts) {
        try {
          this.client = createClient();
          this.isMockMode = false;
          console.log("Cosmos DB client configured. Initialization will run on first request.");
          break;
        } catch (err) {
          console.error("Failed to initialize Cosmos DB client with one configuration path:", err);
          this.client = null;
          this.isMockMode = true;
        }
      }

      if (this.isMockMode) {
        console.error("Cosmos DB initialization failed. Falling back to mock mode.");
        this.ensureMockDataSeeded();
      }
    } else {
      console.log("Cosmos DB environment variables missing. Operating in local mock mode.");
      this.ensureMockDataSeeded();
    }
  }

  getConnectionMode(): "mock" | "cosmos" {
    return this.isMockMode ? "mock" : "cosmos";
  }

  private getContainerConfigs(): CosmosContainerConfig[] {
    return [
      { id: "users" },
      { id: "conversations" },
      { id: "messages", defaultTtl: -1 },
      { id: "handoffs", defaultTtl: -1 },
      { id: "policy_embeddings" },
      { id: "cache_university_data", defaultTtl: 300 },
    ];
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isMockMode || !this.client) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initializeCosmos();
    }

    await this.initPromise;
  }

  private async initializeCosmos(): Promise<void> {
    if (!this.client) {
      throw new Error("Cosmos client not initialized.");
    }

    await this.client.databases.createIfNotExists({ id: this.dbId });

    const database = this.client.database(this.dbId);
    for (const config of this.getContainerConfigs()) {
      await database.containers.createIfNotExists({
        id: config.id,
        partitionKey: { paths: ["/institution_id"] },
        defaultTtl: config.defaultTtl,
      });
    }
  }

  // --- Mock Database Core Utilities ---
  private readMockDB(): MockDBStore {
    try {
      if (fs.existsSync(this.mockFilePath)) {
        const data = fs.readFileSync(this.mockFilePath, "utf8");
        return JSON.parse(data);
      }
    } catch (err) {
      console.error("Error reading mock-db.json:", err);
    }
    return this.getSeedData();
  }

  private writeMockDB(store: MockDBStore) {
    try {
      const dir = path.dirname(this.mockFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.mockFilePath, JSON.stringify(store, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing mock-db.json:", err);
    }
  }

  private ensureMockDataSeeded() {
    if (!fs.existsSync(this.mockFilePath)) {
      console.log("Seeding mock-db.json with initial data...");
      this.writeMockDB(this.getSeedData());
    }
  }

  private getSeedData(): MockDBStore {
    const institutionId = "inst-up";
    return {
      users: [
        {
          id: "user-mara",
          institution_id: institutionId,
          entra_oid: "student-mara-oid",
          role: "Student",
          preferences: { language: "fil" },
        },
        {
          id: "user-jay",
          institution_id: institutionId,
          entra_oid: "agent-jay-oid",
          role: "Agent",
          preferences: { language: "en" },
        },
        {
          id: "user-reyes",
          institution_id: institutionId,
          entra_oid: "admin-reyes-oid",
          role: "Admin",
          preferences: { language: "en" },
        },
      ],
      conversations: [
        {
          id: "ticket-001",
          institution_id: institutionId,
          ticket_id: "ARC-T-1001",
          student_id: "student-mara-oid",
          status: "Open",
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: "ticket-002",
          institution_id: institutionId,
          ticket_id: "ARC-T-1002",
          student_id: "student-mara-oid",
          status: "Resolved",
          assignee_id: "agent-jay-oid",
          created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
      ],
      messages: [
        {
          id: "msg-1",
          institution_id: institutionId,
          conversation_id: "ticket-001",
          role: "user",
          content_scrubbed: "Magkano po ba ang utang ko para sa semester na ito?",
          ts: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: "msg-2",
          institution_id: institutionId,
          conversation_id: "ticket-001",
          role: "assistant",
          content_scrubbed: "Checking the Bursar system. Please wait a few seconds...",
          ts: new Date(Date.now() - 3600000 * 2 + 10000).toISOString(),
        },
      ],
      handoffs: [],
      policyEmbeddings: [
        {
          id: "policy-hold",
          institution_id: institutionId,
          document_id: "bursar-holds-policy",
          chunk_text:
            "Ang Enrollment Hold (Financial Hold) ay inilalagay kapag may natitirang balanse na higit sa ₱5,000. Upang matanggal ang hold, kailangang bayaran ang natitirang balanse o magsumite ng scholarship clearance mula sa Financial Aid Office.",
          embedding: [0.1, -0.2, 0.3],
        },
        {
          id: "policy-sap",
          institution_id: institutionId,
          document_id: "academic-sap-policy",
          chunk_text:
            "Ang Satisfactory Academic Progress (SAP) ay nangangailangan ng GWA na hindi bababa sa 2.50 at completion rate na 67% ng mga enrolled units. Ang mga mag-aaral na bumagsak sa ilalim nito ay mayroong Academic Hold at kailangang mag-file ng appeal form kasama ang personal na paliwanag at supporting documents.",
          embedding: [0.15, -0.1, 0.45],
        },
        {
          id: "policy-unifast",
          institution_id: institutionId,
          document_id: "financial-aid-deadlines",
          chunk_text:
            "Ang deadline para sa pagsusumite ng UniFAST at CHED Scholarship renewal ay hanggang July 15, 2026. Ang mga dokumentong kailangan ay ang GWA certified copy at Registration Form para sa kasalukuyang semester.",
          embedding: [0.05, 0.25, -0.12],
        },
      ],
      cacheUniversityData: [],
    };
  }

  // USERS
  async getUser(id: string, institutionId: string): Promise<UserDoc | null> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.users.find((u) => u.id === id && u.institution_id === institutionId) || null;
    }

    const container = await this.getContainer("users");
    try {
      const { resource } = await container.item(id, institutionId).read();
      return (resource as UserDoc) || null;
    } catch {
      return null;
    }
  }

  async getUserByEntraOid(entraOid: string, institutionId: string): Promise<UserDoc | null> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.users.find((u) => u.entra_oid === entraOid && u.institution_id === institutionId) || null;
    }

    const container = await this.getContainer("users");
    const querySpec = {
      query: "SELECT * FROM c WHERE c.entra_oid = @entraOid",
      parameters: [{ name: "@entraOid", value: entraOid }],
    };
    const { resources } = await container.items
      .query<UserDoc>(querySpec, { partitionKey: institutionId })
      .fetchAll();
    return resources[0] || null;
  }

  async createUser(user: UserDoc): Promise<UserDoc> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      db.users.push(user);
      this.writeMockDB(db);
      return user;
    }

    const container = await this.getContainer("users");
    const { resource } = await container.items.create(user);
    return resource as UserDoc;
  }

  // CONVERSATIONS
  async getConversation(id: string, institutionId: string): Promise<ConversationDoc | null> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.conversations.find((c) => c.id === id && c.institution_id === institutionId) || null;
    }

    const container = await this.getContainer("conversations");
    try {
      const { resource } = await container.item(id, institutionId).read();
      return (resource as ConversationDoc) || null;
    } catch {
      return null;
    }
  }

  async createConversation(conversation: ConversationDoc): Promise<ConversationDoc> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      db.conversations.push(conversation);
      this.writeMockDB(db);
      return conversation;
    }

    const container = await this.getContainer("conversations");
    const { resource } = await container.items.create(conversation);
    return resource as ConversationDoc;
  }

  async getStudentConversations(studentId: string, institutionId: string): Promise<ConversationDoc[]> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.conversations.filter(
        (c) => c.student_id === studentId && c.institution_id === institutionId
      );
    }

    const container = await this.getContainer("conversations");
    const querySpec = {
      query: "SELECT * FROM c WHERE c.student_id = @studentId ORDER BY c.created_at DESC",
      parameters: [{ name: "@studentId", value: studentId }],
    };
    const { resources } = await container.items
      .query<ConversationDoc>(querySpec, { partitionKey: institutionId })
      .fetchAll();
    return resources;
  }

  async getOpenConversations(institutionId: string): Promise<ConversationDoc[]> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.conversations.filter((c) => c.status !== "Resolved" && c.institution_id === institutionId);
    }

    const container = await this.getContainer("conversations");
    const querySpec = {
      query: "SELECT * FROM c WHERE c.status != 'Resolved' ORDER BY c.created_at ASC",
    };
    const { resources } = await container.items
      .query<ConversationDoc>(querySpec, { partitionKey: institutionId })
      .fetchAll();
    return resources;
  }

  async updateConversationStatus(
    id: string,
    institutionId: string,
    status: "Open" | "Pending Agent" | "Resolved",
    assigneeId?: string
  ): Promise<ConversationDoc | null> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      const idx = db.conversations.findIndex((c) => c.id === id && c.institution_id === institutionId);
      if (idx !== -1) {
        db.conversations[idx].status = status;
        if (assigneeId) db.conversations[idx].assignee_id = assigneeId;
        this.writeMockDB(db);
        return db.conversations[idx];
      }
      return null;
    }

    const container = await this.getContainer("conversations");
    const { resource: existing } = await container.item(id, institutionId).read<ConversationDoc>();
    if (!existing) return null;

    const updated = {
      ...existing,
      status,
      assignee_id: assigneeId !== undefined ? assigneeId : existing.assignee_id,
    };
    const { resource } = await container.item(id, institutionId).replace(updated);
    return resource as ConversationDoc;
  }

  // MESSAGES
  async getMessages(conversationId: string, institutionId: string): Promise<MessageDoc[]> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.messages
        .filter((m) => m.conversation_id === conversationId && m.institution_id === institutionId)
        .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    }

    const container = await this.getContainer("messages");
    const querySpec = {
      query: "SELECT * FROM c WHERE c.conversation_id = @conversationId ORDER BY c.ts ASC",
      parameters: [{ name: "@conversationId", value: conversationId }],
    };
    const { resources } = await container.items
      .query<MessageDoc>(querySpec, { partitionKey: institutionId })
      .fetchAll();
    return resources;
  }

  async createMessage(message: MessageDoc): Promise<MessageDoc> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      db.messages.push(message);
      this.writeMockDB(db);
      return message;
    }

    const container = await this.getContainer("messages");
    const { resource } = await container.items.create({
      ...message,
      ttl: 90 * 24 * 60 * 60,
    });
    return resource as MessageDoc;
  }

  // HANDOFFS
  async createHandoff(handoff: HandoffDoc): Promise<HandoffDoc> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      db.handoffs.push(handoff);
      this.writeMockDB(db);
      return handoff;
    }

    const container = await this.getContainer("handoffs");
    const { resource } = await container.items.create({
      ...handoff,
      ttl: 90 * 24 * 60 * 60,
    });
    return resource as HandoffDoc;
  }

  async getHandoffByTicketId(ticketId: string, institutionId: string): Promise<HandoffDoc | null> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.handoffs.find((h) => h.ticket_id === ticketId && h.institution_id === institutionId) || null;
    }

    const container = await this.getContainer("handoffs");
    const querySpec = {
      query: "SELECT * FROM c WHERE c.ticket_id = @ticketId",
      parameters: [{ name: "@ticketId", value: ticketId }],
    };
    const { resources } = await container.items
      .query<HandoffDoc>(querySpec, { partitionKey: institutionId })
      .fetchAll();
    return resources[0] || null;
  }

  // POLICY EMBEDDINGS (RAG)
  async queryPolicies(queryVector: number[], institutionId: string, limit: number = 3): Promise<PolicyEmbeddingDoc[]> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      return db.policyEmbeddings.filter((p) => p.institution_id === institutionId).slice(0, limit);
    }

    const container = await this.getContainer("policy_embeddings");
    const querySpec = {
      query: "SELECT TOP @limit c.document_id, c.chunk_text FROM c ORDER BY VectorDistance(c.embedding, @vector) ASC",
      parameters: [
        { name: "@limit", value: limit },
        { name: "@vector", value: queryVector },
      ],
    };
    const { resources } = await container.items
      .query<PolicyEmbeddingDoc>(querySpec, { partitionKey: institutionId })
      .fetchAll();
    return resources;
  }

  // CACHE
  async getCacheData<T>(cacheKey: string, institutionId: string): Promise<T | null> {
    if (this.isMockMode) {
      const db = this.readMockDB();
      const cached = db.cacheUniversityData.find(
        (c) => c.cache_key === cacheKey && c.institution_id === institutionId
      );
      if (!cached) return null;

      const lifespanMs = (cached.ttl || 300) * 1000;
      if (Date.now() - cached.fetched_at < lifespanMs) {
        return cached.data as T;
      }
      return null;
    }

    const container = await this.getContainer("cache_university_data");
    try {
      const { resource } = await container.item(cacheKey, institutionId).read<CacheUniversityDataDoc>();
      if (!resource) return null;

      const lifespanMs = (resource.ttl || 300) * 1000;
      if (Date.now() - resource.fetched_at < lifespanMs) {
        return resource.data as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  async setCacheData<T>(cacheKey: string, data: T, institutionId: string): Promise<void> {
    const doc: CacheUniversityDataDoc = {
      id: cacheKey,
      institution_id: institutionId,
      cache_key: cacheKey,
      data,
      fetched_at: Date.now(),
      ttl: 300,
    };

    if (this.isMockMode) {
      const db = this.readMockDB();
      db.cacheUniversityData = db.cacheUniversityData.filter(
        (c) => !(c.cache_key === cacheKey && c.institution_id === institutionId)
      );
      db.cacheUniversityData.push(doc);
      this.writeMockDB(db);
      return;
    }

    const container = await this.getContainer("cache_university_data");
    await container.items.upsert(doc);
  }

  private async getContainer(containerId: string): Promise<Container> {
    if (!this.client) {
      throw new Error("Cosmos client not initialized.");
    }

    await this.ensureInitialized();
    return this.client.database(this.dbId).container(containerId);
  }
}

export const cosmosDbService = new CosmosDBService();

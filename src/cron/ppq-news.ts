import { db } from '../db';

class News {
  // public static async createRegularEvents(): Promise<void> {}
  // public static async createTimedEvents(): Promise<void> {}
  // public static async createStoneGachas(): Promise<void> {}
  // public static async createTicketGachas(): Promise<void> {}
  // public static async createMiscNews(): Promise<void> {}
  // public static async createSaleNews(): Promise<void> {}

  // public static async updateRegularEvents(): Promise<void> {}
  // public static async updateTimedEvents(): Promise<void> {}
  // public static async updateStoneGachas(): Promise<void> {}
  // public static async updateTicketGachas(): Promise<void> {}
  // public static async updateMiscNews(): Promise<void> {}
  // public static async updateSaleNews(): Promise<void> {}

  // public static async resetNewsPosts(): Promise<void> {}

  public static async listGuilds(): Promise<string[] | undefined> {
    const guildList: string[] | undefined = await db
      .many('SELECT server_id FROM special_channels')
      .then((data) => data.map((d) => d['server_id'] as string))
      .catch(() => undefined);
    if (!guildList) return;
    return guildList;
  }
}

export { News };

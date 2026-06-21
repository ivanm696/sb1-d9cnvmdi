const { message, tokenId, userId, mode = 'default' }: RequestPayload = await req.json();
const sanitizedMessage = message.replace(/[^a-zA-Z0-9]/g, '');
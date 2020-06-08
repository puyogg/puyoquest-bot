function validChannelID(str: string): boolean {
  return str.startsWith('<#') && str.endsWith('>');
}

function validRoleID(str: string): boolean {
  return str.startsWith('<@&') && str.endsWith('>');
}

function validUserID(str: string): boolean {
  return !validRoleID(str) && str.startsWith('<@') && str.endsWith('>');
}

export { validChannelID, validRoleID, validUserID };

export function generateAvatarURL(id) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`; 
}

export function generateRoomAvatarURL(name) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`;
}
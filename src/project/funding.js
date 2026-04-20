const shared = require('../shared');

// Obtenir le mois courant au format YYYY-MM
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Mettre à jour le statut Discord du bot
async function updateBotStatus(totalDonated, totalCosts) {
  if (!shared.discord || !shared.discord.user) return;
  try {
    const status = `💰 ${totalDonated.toFixed(1)}€/${totalCosts.toFixed(1)}€`;
    await shared.discord.user.setActivity(status, { type: 'WATCHING' });
  } catch (e) {
    console.error('updateBotStatus error:', e.message);
  }
}

// Obtenir ou créer le document de financement du mois courant
async function getFundingData() {
  if (!shared.mongoDb) throw new Error('MongoDB non connecté');
  const month = getCurrentMonth();
  const doc = await shared.mongoDb.collection('projectFunding').findOne({ _id: month });
  if (!doc) {
    const newDoc = {
      _id: month,
      costs: { server: 4.6, claude: 22 }, // 5$ ~ 4.6€
      totalDonated: 0,
      lastUpdated: new Date(),
    };
    await shared.mongoDb.collection('projectFunding').insertOne(newDoc);
    return newDoc;
  }
  return doc;
}

// Ajouter une contribution
async function addDonation(amount) {
  if (!shared.mongoDb) throw new Error('MongoDB non connecté');
  const month = getCurrentMonth();
  const result = await shared.mongoDb.collection('projectFunding').updateOne(
    { _id: month },
    { $inc: { totalDonated: amount }, $set: { lastUpdated: new Date() } },
    { upsert: true }
  );
  const updated = await getFundingData();
  return updated;
}

// Calculer le total des coûts
function calculateTotalCosts(data) {
  return (data.costs?.server || 0) + (data.costs?.claude || 0) + (data.costs?.storage || 0);
}

module.exports = {
  getCurrentMonth,
  getFundingData,
  addDonation,
  calculateTotalCosts,
  updateBotStatus,
};

const { getStates, getState, turnOn, turnOff, callService } = require('./homeAssistant');

const TOOL_DEFINITIONS = [
  {
    name: 'list_entities',
    description: 'Liste tous les appareils d\'un domaine (light, switch, sensor, climate, media_player, cover, fan, vacuum…). Utilise ça pour trouver les entity_id exacts.',
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domaine HA : light, switch, sensor, climate, media_player, cover, fan, input_boolean, script…',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_state',
    description: 'Obtient l\'état actuel d\'un appareil (on/off, température, luminosité…)',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string', description: 'ID HA (ex: light.salon, switch.prise_bureau)' },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'turn_on',
    description: 'Allume un appareil (lumière, switch, prise connectée…)',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string' },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'turn_off',
    description: 'Éteint un appareil',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string' },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'set_brightness',
    description: 'Règle la luminosité d\'une lumière',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string' },
        brightness_pct: {
          type: 'number',
          description: 'Pourcentage de luminosité 0–100',
        },
      },
      required: ['entity_id', 'brightness_pct'],
    },
  },
  {
    name: 'set_color',
    description: 'Change la couleur d\'une lumière RGB',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string' },
        color_name: {
          type: 'string',
          description: 'Nom de couleur anglais : red, blue, green, yellow, orange, pink, purple, white…',
        },
      },
      required: ['entity_id', 'color_name'],
    },
  },
  {
    name: 'set_temperature',
    description: 'Règle la température d\'un thermostat',
    input_schema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string' },
        temperature: { type: 'number', description: 'Température en °C' },
      },
      required: ['entity_id', 'temperature'],
    },
  },
  {
    name: 'call_service',
    description: 'Appelle n\'importe quel service HA (pour les cas non couverts)',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string' },
        service: { type: 'string' },
        data: { type: 'object' },
      },
      required: ['domain', 'service'],
    },
  },
];

async function executeTool(name, input) {
  switch (name) {
    case 'list_entities': {
      const entities = await getStates(input.domain);
      if (!entities.length) return `Aucune entité trouvée pour le domaine "${input.domain}"`;
      const list = entities.map(e => ({
        entity_id: e.entity_id,
        name: e.attributes.friendly_name || e.entity_id,
        state: e.state,
      }));
      return JSON.stringify(list, null, 2);
    }

    case 'get_state': {
      const s = await getState(input.entity_id);
      return JSON.stringify({
        entity_id: s.entity_id,
        state: s.state,
        friendly_name: s.attributes.friendly_name,
        attributes: s.attributes,
      }, null, 2);
    }

    case 'turn_on':
      await turnOn(input.entity_id);
      return `✅ ${input.entity_id} allumé`;

    case 'turn_off':
      await turnOff(input.entity_id);
      return `✅ ${input.entity_id} éteint`;

    case 'set_brightness':
      await callService('light', 'turn_on', {
        entity_id: input.entity_id,
        brightness_pct: input.brightness_pct,
      });
      return `✅ Luminosité de ${input.entity_id} → ${input.brightness_pct}%`;

    case 'set_color':
      await callService('light', 'turn_on', {
        entity_id: input.entity_id,
        color_name: input.color_name,
      });
      return `✅ Couleur de ${input.entity_id} → ${input.color_name}`;

    case 'set_temperature':
      await callService('climate', 'set_temperature', {
        entity_id: input.entity_id,
        temperature: input.temperature,
      });
      return `✅ Température de ${input.entity_id} → ${input.temperature}°C`;

    case 'call_service':
      await callService(input.domain, input.service, input.data || {});
      return `✅ Service ${input.domain}.${input.service} appelé`;

    default:
      throw new Error(`Tool inconnu: ${name}`);
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };

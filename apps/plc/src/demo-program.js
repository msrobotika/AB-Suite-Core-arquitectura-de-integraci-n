/** Editable teaching demo: conveyor with start/stop, TON and CTU. */
const contact = (tag, nc = false) => ({ op: "contact", tag, nc });
const and = (...items) => ({ op: "and", items });
const or = (...items) => ({ op: "or", items });

export const demoProgram = {
  version: 1,
  name: "Línea 01 · Transportador",
  description: "Enclavamiento de marcha, seguridad simulada, retardo y contador de paquetes.",
  rungs: [
    {
      id: "R01", name: "Marcha / auto-retención + permisos",
      when: and(or(contact("I0.0"), contact("Q0.0")), contact("I0.1"), contact("I0.2")),
      action: { type: "coil", target: "Q0.0" }
    },
    {
      id: "R02", name: "TON · señal de marcha estable (2 s)",
      when: contact("Q0.0"),
      action: { type: "ton", target: "T0", presetMs: 2000 }
    },
    {
      id: "R03", name: "Piloto de marcha estable",
      when: contact("T0"),
      action: { type: "coil", target: "Q0.1" }
    },
    {
      id: "R04", name: "CTU · paquetes detectados (5)",
      when: and(contact("Q0.0"), contact("I0.3")),
      action: { type: "ctu", target: "C0", preset: 5 }
    },
    {
      id: "R05", name: "Reinicio del contador",
      when: contact("I0.4"),
      action: { type: "resetCounter", target: "C0" }
    },
    {
      id: "R06", name: "Luz · lote completo",
      when: contact("C0"),
      action: { type: "coil", target: "Q0.2" }
    }
  ]
};

export const inputLabels = {
  "I0.0": "Pulsador de marcha",
  "I0.1": "Permiso de paro",
  "I0.2": "Permiso de emergencia",
  "I0.3": "Sensor de piezas",
  "I0.4": "Reset contador"
};
export const outputLabels = {
  "Q0.0": "Motor cinta",
  "Q0.1": "Marcha estable",
  "Q0.2": "Lote completo"
};

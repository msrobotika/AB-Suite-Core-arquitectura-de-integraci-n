/**
 * First-run guidance for the virtual PLC lab.
 * Pure, side-effect-free state model: never changes the PLC or plant.
 */
export function guideForSnapshot(frame) {
  const scenario = frame?.scenario;
  if (!["conveyor", "tank", "rack"].includes(scenario)) {
    throw new Error("Escenario no disponible para la guía");
  }

  if (frame.mode !== "RUN") {
    return {
      step: 1,
      title: frame.mode === "PAUSE" ? "Reanuda la CPU virtual" : "Arranca la CPU virtual",
      description: frame.mode === "PAUSE"
        ? "Pulsa RUN para continuar el proceso desde el estado pausado."
        : "Pulsa RUN en «Controlador virtual». Esto solo ejecuta una simulación en tu navegador."
    };
  }

  if (Object.values(frame.faults ?? {}).some(Boolean)) {
    return {
      step: 4,
      title: "Comprueba el fallo virtual",
      description: "Revisa las señales y el registro de ejecución; desmarca el fallo para recuperar el proceso."
    };
  }

  if (frame.cpu?.inputs?.["I0.2"] === false) {
    return {
      step: 2,
      title: "Rearma el E-STOP virtual",
      description: "Restaura el permiso simulado y vuelve a pulsar MARCHA. No es un circuito de seguridad real."
    };
  }

  if (scenario === "rack") {
    if (!frame.cpu?.inputs?.["I0.0"]) {
      return {
        step: 2,
        title: "Conmuta la entrada I0.0",
        description: "En «Entradas / salidas», pulsa I0.0 para activar su salida digital virtual."
      };
    }
    if (!frame.cpu?.outputs?.["Q0.0"]) {
      return {
        step: 3,
        title: "Observa el siguiente scan",
        description: "Comprueba el estado de Q0.0 cuando la CPU procese el cambio de entrada."
      };
    }
    return {
      step: 4,
      title: "Verifica y exporta",
      description: "Comprueba Q0.0, espera el temporizador de Q0.1 y exporta el programa si deseas conservarlo."
    };
  }

  if (!frame.cpu?.outputs?.["Q0.0"]) {
    return {
      step: 2,
      title: "Pon en marcha el proceso",
      description: scenario === "tank"
        ? "Pulsa MARCHA para iniciar el llenado del depósito virtual."
        : "Pulsa MARCHA para activar el transportador simulado."
    };
  }

  const progressed = scenario === "tank"
    ? Number(frame.plant?.level) >= 25
    : Number(frame.plant?.delivered) >= 1;
  if (!progressed) {
    return {
      step: 3,
      title: "Observa la evolución del proceso",
      description: scenario === "tank"
        ? "Mira cómo sube el nivel y cambia el gráfico; la señal es completamente virtual."
        : "Sigue los paquetes y la fotocélula hasta que se registre la primera entrega."
    };
  }

  return {
    step: 4,
    title: "Provoca y diagnostica un fallo",
    description: scenario === "tank"
      ? "En «Inyección de fallos», activa «Fuga» y observa cómo cambia el nivel. Luego retírala."
      : "En «Inyección de fallos», activa «Motor atascado» y observa las señales. Luego retíralo."
  };
}

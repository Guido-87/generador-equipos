class Jugador {
    constructor(nombre, posicion, habilidad, estado) {
        this.nombre = nombre;
        this.posicion = posicion;
        this.habilidad = habilidad;
        this.estado = estado;
    }

    score() {
        return Math.round(
            (this.habilidad * 0.7 + this.estado * 0.3) * 10
        );
    }
}

// --------------------------------
// CONFIGURACIÓN
// --------------------------------

const MAX_JUGADORES = 22;
const MODALIDAD = "F9";

const FORMACIONES = {
    F5:  { ARQ: 1, DEF: 1, MED: 2, DEL: 1 },
    F7:  { ARQ: 1, DEF: 2, MED: 2, DEL: 2 },
    F9:  { ARQ: 1, DEF: 3, MED: 3, DEL: 2 },
    F11: { ARQ: 1, DEF: 4, MED: 4, DEL: 2 }
};

const TAMANIO_POBLACION = 100;
const GENERACIONES = 200;
const TASA_MUTACION = 0.10;

// Peso de los criterios de equilibrio
const PESO_POSICIONES = 20;
const PESO_ARQUEROS = 20;

// --------------------------------
// FUNCIONES AUXILIARES
// --------------------------------

function scoreEquipo(equipo) {
    return equipo.reduce(
        (total, jugador) => total + jugador.score(),
        0
    );
}

function mezclar(array) {
    const resultado = [...array];

    for (let i = resultado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resultado[i], resultado[j]] =
            [resultado[j], resultado[i]];
    }

    return resultado;
}

function construirEquipos(individuo, jugadores) {
    const equipos = [[], []];

    individuo.forEach((equipo, i) => {
        equipos[equipo].push(jugadores[i]);
    });

    return equipos;
}

// Garantiza que los equipos difieran como máximo
// en un jugador, sin ciclos potencialmente infinitos.
function equilibrarCantidad(individuo, jugadores) {
    const objetivoEquipo0 = Math.ceil(jugadores.length / 2);

    let cantidad0 = individuo.filter(
        equipo => equipo === 0
    ).length;

    const indices0 = mezclar(
        individuo.map((equipo, i) => equipo === 0 ? i : -1)
            .filter(i => i !== -1)
    );

    const indices1 = mezclar(
        individuo.map((equipo, i) => equipo === 1 ? i : -1)
            .filter(i => i !== -1)
    );

    if (cantidad0 > objetivoEquipo0) {
        const cantidadMover = cantidad0 - objetivoEquipo0;

        indices0.slice(0, cantidadMover).forEach(i => {
            individuo[i] = 1;
        });
    } else if (cantidad0 < objetivoEquipo0) {
        const cantidadMover = objetivoEquipo0 - cantidad0;

        indices1.slice(0, cantidadMover).forEach(i => {
            individuo[i] = 0;
        });
    }

    return individuo;
}

// Genera una distribución inicial equilibrada
function crearIndividuo(jugadores) {
    const indices = mezclar(
        jugadores.map((_, i) => i)
    );

    const individuo = Array(jugadores.length);

    indices.forEach((indice, i) => {
        individuo[indice] =
            i < Math.ceil(jugadores.length / 2) ? 0 : 1;
    });

    return individuo;
}

// --------------------------------
// EVALUACIÓN DE LOS EQUIPOS
// --------------------------------

function fitness(individuo, jugadores) {
    const equipos = construirEquipos(individuo, jugadores);
    const formacion = FORMACIONES[MODALIDAD];

    const puntaje0 = scoreEquipo(equipos[0]);
    const puntaje1 = scoreEquipo(equipos[1]);

    // Criterio 1: equilibrio del puntaje total
    const diferenciaPuntaje = Math.abs(puntaje0 - puntaje1);

    // Criterio 2: equilibrio de las posiciones
    let penalizacionPosiciones = 0;

    for (const posicion of ["ARQ", "DEF", "MED", "DEL"]) {
        for (const equipo of equipos) {
            const cantidadReal = equipo.filter(
                jugador => jugador.posicion === posicion
            ).length;

            const cantidadObjetivo = formacion[posicion];

            penalizacionPosiciones +=
                Math.abs(cantidadReal - cantidadObjetivo);
        }
    }

    // Criterio 3: intentar repartir los arqueros
    const arqueros0 = equipos[0].filter(
        jugador => jugador.posicion === "ARQ"
    ).length;

    const arqueros1 = equipos[1].filter(
        jugador => jugador.posicion === "ARQ"
    ).length;

    const penalizacionArqueros =
        Math.abs(arqueros0 - arqueros1);

    return diferenciaPuntaje
        + penalizacionPosiciones * PESO_POSICIONES
        + penalizacionArqueros * PESO_ARQUEROS;
}

// --------------------------------
// CRUCE Y MUTACIÓN
// --------------------------------

function crossover(padre1, padre2, jugadores) {
    const hijo = padre1.map((equipo, i) =>
        Math.random() < 0.5 ? equipo : padre2[i]
    );

    return equilibrarCantidad(hijo, jugadores);
}

function mutar(individuo, jugadores) {
    for (let i = 0; i < individuo.length; i++) {
        if (Math.random() < TASA_MUTACION) {
            individuo[i] = 1 - individuo[i];
        }
    }

    equilibrarCantidad(individuo, jugadores);
}

// --------------------------------
// ALGORITMO GENÉTICO
// --------------------------------

function algoritmoGenetico(jugadores) {
    let poblacion = Array.from(
        { length: TAMANIO_POBLACION },
        () => crearIndividuo(jugadores)
    );

    for (let g = 0; g < GENERACIONES; g++) {
        poblacion.sort(
            (a, b) => fitness(a, jugadores) - fitness(b, jugadores)
        );

        const nuevaPoblacion = poblacion.slice(0, 20);

        while (nuevaPoblacion.length < TAMANIO_POBLACION) {
            const limitePadres = Math.min(50, poblacion.length);

            const padre1 = poblacion[
                Math.floor(Math.random() * limitePadres)
                ];

            const padre2 = poblacion[
                Math.floor(Math.random() * limitePadres)
                ];

            const hijo = crossover(padre1, padre2, jugadores);
            mutar(hijo, jugadores);

            nuevaPoblacion.push(hijo);
        }

        poblacion = nuevaPoblacion;
    }

    poblacion.sort(
        (a, b) => fitness(a, jugadores) - fitness(b, jugadores)
    );

    return poblacion[0];
}

// --------------------------------
// JUGADORES
// --------------------------------

const jugadores = [
    // ARQUEROS
    new Jugador("Edu", "ARQ", 9, 9),
    new Jugador("Agus", "ARQ", 7, 7),

    // DEFENSORES
    new Jugador("Guido", "DEF", 8, 7),
    new Jugador("Seba", "DEF", 8, 7),
    new Jugador("Leo", "DEF", 7, 7),
    new Jugador("Zapa", "DEF", 8, 9),
    new Jugador("Bruno", "DEF", 9, 9),
    new Jugador("Boni", "DEF", 7, 6),

    // MEDIOCAMPISTAS
    new Jugador("Yorgi", "MED", 7.5, 7),
    new Jugador("Naza", "MED", 9, 6),
    new Jugador("Julio", "MED", 8.5, 8),
    new Jugador("Dani", "MED", 6, 5),
    new Jugador("Ema", "MED", 7, 6),
    new Jugador("Elias", "MED", 7, 6),

    // DELANTEROS
    new Jugador("Ariel", "DEL", 6, 4),
    new Jugador("Beto", "DEL", 7, 6),
    new Jugador("Antonio", "DEL", 7, 7),
    new Jugador("Tobi", "DEL", 7.5, 8)
];

// --------------------------------
// EJECUCIÓN Y RESULTADOS
// --------------------------------

if (jugadores.length < 2 || jugadores.length > MAX_JUGADORES) {
    throw new Error(
        `Ingresá entre 2 y ${MAX_JUGADORES} jugadores.`
    );
}

const mejor = algoritmoGenetico(jugadores);
const equipos = construirEquipos(mejor, jugadores);

const ordenPosiciones = {
    ARQ: 1,
    DEF: 2,
    MED: 3,
    DEL: 4
};

equipos.forEach((equipo, i) => {
    equipo.sort(
        (a, b) =>
            ordenPosiciones[a.posicion] -
            ordenPosiciones[b.posicion] ||
            a.nombre.localeCompare(b.nombre)
    );

    console.log(`========== EQUIPO ${i + 1} ==========`);

    equipo.forEach(jugador => {
        console.log(
            `${jugador.posicion} - ${jugador.nombre} | ` +
            `Puntaje: ${jugador.score()}`
        );
    });

    console.log(`Jugadores: ${equipo.length}`);
    console.log(`Puntaje total: ${scoreEquipo(equipo)}`);

    for (const posicion of ["ARQ", "DEF", "MED", "DEL"]) {
        const cantidad = equipo.filter(
            jugador => jugador.posicion === posicion
        ).length;

        console.log(`${posicion}: ${cantidad}`);
    }

    console.log("");
});

console.log(
    "Diferencia de puntaje:",
    Math.abs(
        scoreEquipo(equipos[0]) - scoreEquipo(equipos[1])
    )
);

console.log(
    "Evaluación del equilibrio:",
    fitness(mejor, jugadores)
);
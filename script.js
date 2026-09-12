// --- ESTADO GLOBAL ---
let gastos = [];
let historialQuincenas = [];
let miGrafico = null; 

// --- ELEMENTOS DEL DOM ---
const formGasto = document.getElementById('form-gasto');
const nombreGastoInput = document.getElementById('nombre-gasto');
const montoGastoInput = document.getElementById('monto-gasto');
const listaGastosUI = document.getElementById('lista-gastos');
const salarioAdrianInput = document.getElementById('salario-adrian');
const salarioVanessaInput = document.getElementById('salario-vanessa');
const selectHistorial = document.getElementById('select-historial');

const totalGastosUI = document.getElementById('total-gastos');
const totalIngresosUI = document.getElementById('total-ingresos');
const nosQuedaUI = document.getElementById('nos-queda');
const parteAdrianUI = document.getElementById('parte-adrian');
const parteVanessaUI = document.getElementById('parte-vanessa');

// Formateador de moneda CRC
const formateadorCRC = new Intl.NumberFormat('es-CR', {
    style: 'currency', currency: 'CRC', minimumFractionDigits: 0
});

// --- LÓGICA DE GASTOS ---
formGasto.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = nombreGastoInput.value.trim();
    const monto = parseFloat(montoGastoInput.value);

    if (nombre && !isNaN(monto) && monto > 0) {
        gastos.push({ id: Date.now(), nombre, monto });
        nombreGastoInput.value = '';
        montoGastoInput.value = '';
        nombreGastoInput.focus();
        actualizarUI();
    }
});

function eliminarGasto(id) {
    gastos = gastos.filter(gasto => gasto.id !== id);
    actualizarUI();
}

// --- ACTUALIZAR INTERFAZ Y GRÁFICO ---
function actualizarUI() {
    listaGastosUI.innerHTML = '';
    let sumaGastos = 0;

    gastos.forEach(gasto => {
        sumaGastos += gasto.monto;
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${gasto.nombre}</span>
            <span>
                ${formateadorCRC.format(gasto.monto)}
                <button onclick="eliminarGasto(${gasto.id})">✕</button>
            </span>
        `;
        listaGastosUI.appendChild(li);
    });

    const salarioAdrian = parseFloat(salarioAdrianInput.value) || 0;
    const salarioVanessa = parseFloat(salarioVanessaInput.value) || 0;
    const totalIngresos = salarioAdrian + salarioVanessa;
    const nosQueda = totalIngresos - sumaGastos;
    const parteIgualitaria = nosQueda / 2;

    totalGastosUI.textContent = formateadorCRC.format(sumaGastos);
    totalIngresosUI.textContent = formateadorCRC.format(totalIngresos);
    nosQuedaUI.textContent = formateadorCRC.format(nosQueda);
    nosQuedaUI.style.color = nosQueda < 0 ? 'var(--danger)' : 'var(--primary)';
    parteAdrianUI.textContent = formateadorCRC.format(parteIgualitaria);
    parteVanessaUI.textContent = formateadorCRC.format(parteIgualitaria);

    actualizarGrafico();
    guardarEnLocalStorage();
}

// --- LÓGICA DE CHART.JS ---
function actualizarGrafico() {
    const canvas = document.getElementById('grafico-gastos');
    const mensaje = document.getElementById('mensaje-grafico');

    if (gastos.length === 0) {
        canvas.style.display = 'none';
        mensaje.style.display = 'block';
        if (miGrafico) { miGrafico.destroy(); miGrafico = null; }
        return;
    }

    canvas.style.display = 'block';
    mensaje.style.display = 'none';

    const labels = gastos.map(g => g.nombre);
    const data = gastos.map(g => g.monto);
    const colores = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    if (miGrafico) { miGrafico.destroy(); }

    miGrafico = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${formateadorCRC.format(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// --- HISTORIAL DE QUINCENAS ---
document.getElementById('btn-guardar-historial').addEventListener('click', () => {
    if (gastos.length === 0 && !salarioAdrianInput.value && !salarioVanessaInput.value) {
        alert('No hay datos para guardar.');
        return;
    }
    
    const nombreQuincena = prompt('Nombre de esta quincena (Ej. "1ra Quincena Octubre 2024"):', `Quincena ${historialQuincenas.length + 1}`);
    if (!nombreQuincena) return;

    const nuevaQuincena = {
        id: Date.now(),
        nombre: nombreQuincena,
        fecha: new Date().toLocaleDateString('es-CR'),
        gastos: [...gastos],
        salarioAdrian: parseFloat(salarioAdrianInput.value) || 0,
        salarioVanessa: parseFloat(salarioVanessaInput.value) || 0
    };

    historialQuincenas.push(nuevaQuincena);
    actualizarSelectHistorial();
    guardarEnLocalStorage();
    alert('Quincena guardada en el historial exitosamente.');
});

function actualizarSelectHistorial() {
    selectHistorial.innerHTML = '<option value="">-- Historial --</option>';
    historialQuincenas.forEach(q => {
        const option = document.createElement('option');
        option.value = q.id;
        option.textContent = `${q.nombre} (${q.fecha})`;
        selectHistorial.appendChild(option);
    });
}

selectHistorial.addEventListener('change', (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;

    const quincena = historialQuincenas.find(q => q.id === id);
    if (quincena) {
        if(confirm(`¿Cargar los datos de "${quincena.nombre}"? Esto reemplazará la vista actual.`)) {
            gastos = [...quincena.gastos];
            salarioAdrianInput.value = quincena.salarioAdrian;
            salarioVanessaInput.value = quincena.salarioVanessa;
            actualizarUI();
        } else {
            selectHistorial.value = ""; 
        }
    }
});

// --- EXPORTAR / IMPORTAR JSON ---
document.getElementById('btn-exportar').addEventListener('click', () => {
    const datos = {
        gastosActuales: gastos,
        salarioAdrian: salarioAdrianInput.value,
        salarioVanessa: salarioVanessaInput.value,
        historial: historialQuincenas
    };
    
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-planificador-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('importar-archivo').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = (evento) => {
        try {
            const datos = JSON.parse(evento.target.result);
            if (datos.gastosActuales) {
                gastos = datos.gastosActuales;
                salarioAdrianInput.value = datos.salarioAdrian || '';
                salarioVanessaInput.value = datos.salarioVanessa || '';
                historialQuincenas = datos.historial || [];
                
                actualizarSelectHistorial();
                actualizarUI();
                alert('Datos importados correctamente.');
            } else {
                alert('El archivo no tiene el formato correcto.');
            }
        } catch (error) {
            alert('Error al leer el archivo JSON.');
        }
    };
    reader.readAsText(archivo);
    e.target.value = ''; 
});

// --- LOCALSTORAGE Y LIMPIAR ---
function guardarEnLocalStorage() {
    const datos = {
        gastosActuales: gastos,
        salarioAdrian: salarioAdrianInput.value,
        salarioVanessa: salarioVanessaInput.value,
        historial: historialQuincenas
    };
    localStorage.setItem('planificadorQuincenalV2', JSON.stringify(datos));
}

function cargarDeLocalStorage() {
    const datosGuardados = localStorage.getItem('planificadorQuincenalV2');
    if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        gastos = datos.gastosActuales || [];
        salarioAdrianInput.value = datos.salarioAdrian || '';
        salarioVanessaInput.value = datos.salarioVanessa || '';
        historialQuincenas = datos.historial || [];
        actualizarSelectHistorial();
    }
    actualizarUI();
}

document.getElementById('btn-limpiar').addEventListener('click', () => {
    if (confirm('¿Borrar la quincena actual? (El historial no se borrará)')) {
        gastos = [];
        salarioAdrianInput.value = '';
        salarioVanessaInput.value = '';
        selectHistorial.value = "";
        actualizarUI();
    }
});

salarioAdrianInput.addEventListener('input', actualizarUI);
salarioVanessaInput.addEventListener('input', actualizarUI);

// Inicializar
cargarDeLocalStorage();
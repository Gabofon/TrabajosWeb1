// --- CUENTA ADMINISTRADOR ÚNICA Y ALMACENAMIENTO INICIAL ---
const ADMIN_DEFAULT = {
  id: 1,
  nombre: "Administrador Taller",
  email: "admin@taller.com",
  pass: "admin123",
  rol: "admin"
};

// Garantizar que siempre exista el administrador y que los mantenimientos empiecen en blanco
let usuariosGuardados = JSON.parse(localStorage.getItem("usuarios")) || [];
if (!usuariosGuardados.some(u => u.email === ADMIN_DEFAULT.email)) {
  usuariosGuardados.push(ADMIN_DEFAULT);
  localStorage.setItem("usuarios", JSON.stringify(usuariosGuardados));
}

if (!localStorage.getItem("mantenimientos")) {
  localStorage.setItem("mantenimientos", JSON.stringify([]));
}

// --- NAVEGACIÓN ENTRE VISTAS ---
function mostrarVista(vista) {
  document.querySelectorAll(".vista").forEach(v => v.classList.add("hidden"));
  document.getElementById(`vista-${vista}`).classList.remove("hidden");
  actualizarNavbar();
}

function irAPanel() {
  const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
  if (!sesion) return mostrarVista("auth");

  if (sesion.rol === "admin") {
    renderTablaAdmin();
    mostrarVista("admin");
  } else {
    document.getElementById("cliente-saludo").textContent = `Hola, ${sesion.nombre}`;
    renderTablaCliente(sesion.email);
    mostrarVista("cliente");
  }
}

function actualizarNavbar() {
  const sesion = JSON.parse(localStorage.getItem("sesionActiva"));
  const navAuth = document.getElementById("nav-auth");
  const navPanel = document.getElementById("nav-panel");
  const navLogout = document.getElementById("nav-logout");

  if (sesion) {
    navAuth.classList.add("hidden");
    navPanel.classList.remove("hidden");
    navLogout.classList.remove("hidden");
  } else {
    navAuth.classList.remove("hidden");
    navPanel.classList.add("hidden");
    navLogout.classList.add("hidden");
  }
}

// --- AUTENTICACIÓN Y REGISTRO (SOLO CLIENTES) ---
function cambiarTabAuth(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-registro").classList.toggle("active", tab === "registro");
  document.getElementById("form-login").classList.toggle("hidden", tab !== "login");
  document.getElementById("form-registro").classList.toggle("hidden", tab !== "registro");
}

function registrarUsuario(e) {
  e.preventDefault();
  const nombre = document.getElementById("reg-nombre").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const pass = document.getElementById("reg-pass").value;

  const usuarios = JSON.parse(localStorage.getItem("usuarios"));

  if (usuarios.some(u => u.email === email)) {
    alert("Este correo ya está registrado.");
    return;
  }

  // Todo usuario registrado desde el formulario se crea con rol "cliente"
  const nuevoUsuario = { id: Date.now(), nombre, email, pass, rol: "cliente" };
  usuarios.push(nuevoUsuario);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
  localStorage.setItem("sesionActiva", JSON.stringify(nuevoUsuario));

  e.target.reset();
  irAPanel();
}

function iniciarSesion(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pass = document.getElementById("login-pass").value;

  const usuarios = JSON.parse(localStorage.getItem("usuarios"));
  const usuario = usuarios.find(u => u.email === email && u.pass === pass);

  if (!usuario) {
    alert("Correo o contraseña incorrectos.");
    return;
  }

  localStorage.setItem("sesionActiva", JSON.stringify(usuario));
  e.target.reset();
  irAPanel();
}

function cerrarSesion() {
  localStorage.removeItem("sesionActiva");
  mostrarVista("inicio");
}

// --- LÓGICA DEL ADMINISTRADOR (MODAL + ESTADÍSTICAS + CRUD) ---
function cargarSelectClientes() {
  const select = document.getElementById("mant-cliente");
  const usuarios = JSON.parse(localStorage.getItem("usuarios"));
  const clientes = usuarios.filter(u => u.rol === "cliente");

  select.innerHTML = "";
  if (clientes.length === 0) {
    select.innerHTML = `<option value="">No hay clientes registrados aún</option>`;
    return false;
  }

  clientes.forEach(c => {
    const option = document.createElement("option");
    option.value = c.email;
    option.textContent = `${c.nombre} (${c.email})`;
    select.appendChild(option);
  });
  return true;
}

function abrirModalAdmin(esEdicion = false) {
  const hayClientes = cargarSelectClientes();
  if (!hayClientes) {
    alert("Aún no hay clientes registrados. Primero debe registrarse un cliente para asignarle un mantenimiento.");
    return;
  }

  if (!esEdicion) {
    document.getElementById("form-mantenimiento").reset();
    document.getElementById("mant-id").value = "";
    document.getElementById("form-crud-titulo").textContent = "Registrar Nuevo Mantenimiento";
    document.getElementById("btn-guardar-mant").textContent = "Guardar Registro";
  }
  document.getElementById("modal-admin").classList.remove("hidden");
}

function cerrarModalAdmin() {
  document.getElementById("modal-admin").classList.add("hidden");
  document.getElementById("form-mantenimiento").reset();
  document.getElementById("mant-id").value = "";
}

function actualizarEstadisticasAdmin(mantenimientos) {
  const total = mantenimientos.length;
  const activos = mantenimientos.filter(m => m.estado === "Pendiente" || m.estado === "En Proceso").length;
  const completados = mantenimientos.filter(m => m.estado === "Completado").length;
  const ingresos = mantenimientos.reduce((sum, m) => sum + Number(m.costo || 0), 0);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-activos").textContent = activos;
  document.getElementById("stat-completados").textContent = completados;
  document.getElementById("stat-ingresos").textContent = `$${ingresos.toFixed(2)}`;
}

// CREATE & UPDATE
function guardarMantenimiento(e) {
  e.preventDefault();
  const idEdicion = document.getElementById("mant-id").value;
  const clienteEmail = document.getElementById("mant-cliente").value;
  const vehiculo = document.getElementById("mant-vehiculo").value.trim();
  const servicio = document.getElementById("mant-servicio").value;
  const fecha = document.getElementById("mant-fecha").value;
  const costo = parseFloat(document.getElementById("mant-costo").value);
  const estado = document.getElementById("mant-estado").value;
  const notas = document.getElementById("mant-notas").value.trim();

  if (!clienteEmail) {
    alert("Debes seleccionar un cliente válido.");
    return;
  }

  const usuarios = JSON.parse(localStorage.getItem("usuarios"));
  const clienteObj = usuarios.find(u => u.email === clienteEmail);
  let mantenimientos = JSON.parse(localStorage.getItem("mantenimientos"));

  if (idEdicion) {
    const index = mantenimientos.findIndex(m => m.id == idEdicion);
    if (index !== -1) {
      mantenimientos[index] = {
        ...mantenimientos[index],
        clienteEmail,
        clienteNombre: clienteObj ? clienteObj.nombre : clienteEmail,
        vehiculo,
        servicio,
        fecha,
        costo,
        estado,
        notas
      };
    }
  } else {
    const nuevo = {
      id: Date.now(),
      clienteEmail,
      clienteNombre: clienteObj ? clienteObj.nombre : clienteEmail,
      vehiculo,
      servicio,
      fecha,
      costo,
      estado,
      notas
    };
    mantenimientos.push(nuevo);
  }

  localStorage.setItem("mantenimientos", JSON.stringify(mantenimientos));
  cerrarModalAdmin();
  renderTablaAdmin();
}

// READ (Admin con búsqueda y filtro)
function renderTablaAdmin() {
  const tbody = document.getElementById("tabla-admin-body");
  const emptyMsg = document.getElementById("admin-sin-datos");
  const todosMantenimientos = JSON.parse(localStorage.getItem("mantenimientos"));

  actualizarEstadisticasAdmin(todosMantenimientos);

  const textoBusqueda = (document.getElementById("buscar-admin")?.value || "").toLowerCase();
  const estadoFiltro = document.getElementById("filtro-estado-admin")?.value || "TODOS";

  const filtrados = todosMantenimientos.filter(m => {
    const coincideTexto =
      m.clienteNombre.toLowerCase().includes(textoBusqueda) ||
      m.clienteEmail.toLowerCase().includes(textoBusqueda) ||
      m.vehiculo.toLowerCase().includes(textoBusqueda) ||
      m.servicio.toLowerCase().includes(textoBusqueda);

    const coincideEstado = estadoFiltro === "TODOS" || m.estado === estadoFiltro;
    return coincideTexto && coincideEstado;
  });

  tbody.innerHTML = "";

  if (filtrados.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");
  filtrados.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${m.clienteNombre}</strong><br><small style="color:#94a3b8">${m.clienteEmail}</small></td>
      <td>${m.vehiculo}</td>
      <td>${m.servicio}</td>
      <td>${m.fecha}</td>
      <td><strong>$${m.costo.toFixed(2)}</strong></td>
      <td><span class="estado-badge estado-${m.estado.split(' ')[0]}">${m.estado}</span></td>
      <td style="max-width:200px; color:#94a3b8; font-size:0.85rem;">${m.notas || "—"}</td>
      <td style="white-space:nowrap;">
        <button class="btn-accion btn-edit" onclick="editarMantenimiento(${m.id})">Editar</button>
        <button class="btn-accion btn-delete" onclick="eliminarMantenimiento(${m.id})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Cargar datos en el modal para editar
function editarMantenimiento(id) {
  const mantenimientos = JSON.parse(localStorage.getItem("mantenimientos"));
  const item = mantenimientos.find(m => m.id === id);
  if (!item) return;

  abrirModalAdmin(true);

  document.getElementById("mant-id").value = item.id;
  document.getElementById("mant-cliente").value = item.clienteEmail;
  document.getElementById("mant-vehiculo").value = item.vehiculo;
  document.getElementById("mant-servicio").value = item.servicio;
  document.getElementById("mant-fecha").value = item.fecha;
  document.getElementById("mant-costo").value = item.costo;
  document.getElementById("mant-estado").value = item.estado;
  document.getElementById("mant-notas").value = item.notas;

  document.getElementById("form-crud-titulo").textContent = "Editar Mantenimiento";
  document.getElementById("btn-guardar-mant").textContent = "Actualizar Registro";
}

// DELETE
function eliminarMantenimiento(id) {
  if (!confirm("¿Estás seguro de eliminar este registro de mantenimiento?")) return;

  let mantenimientos = JSON.parse(localStorage.getItem("mantenimientos"));
  mantenimientos = mantenimientos.filter(m => m.id !== id);
  localStorage.setItem("mantenimientos", JSON.stringify(mantenimientos));
  renderTablaAdmin();
}

// --- LÓGICA DEL CLIENTE (SOLO LECTURA FILTRADA) ---
function renderTablaCliente(emailCliente) {
  const tbody = document.getElementById("tabla-cliente-body");
  const emptyMsg = document.getElementById("mensaje-sin-datos");
  const mantenimientos = JSON.parse(localStorage.getItem("mantenimientos"));

  const misMantenimientos = mantenimientos.filter(m => m.clienteEmail === emailCliente);
  tbody.innerHTML = "";

  if (misMantenimientos.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");
  misMantenimientos.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${m.vehiculo}</strong></td>
      <td>${m.servicio}</td>
      <td>${m.fecha}</td>
      <td>$${m.costo.toFixed(2)}</td>
      <td><span class="estado-badge estado-${m.estado.split(' ')[0]}">${m.estado}</span></td>
      <td>${m.notas || "Sin observaciones"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Inicializar barra al cargar la página
actualizarNavbar();
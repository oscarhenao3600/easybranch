// Métodos adicionales para gestión de usuarios
// Estos métodos se agregan al objeto dashboardApp globalmente

// Cargar negocios para filtro de usuarios
async function loadBusinessesForUserFilter() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${dashboardApp.baseURL}/business`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar negocios');
        }

        const data = await response.json();
        const businessSelect = document.getElementById('userBusinessFilter');
        const businessSelectModal = document.getElementById('userBusiness');
        
        if (businessSelect) {
            businessSelect.innerHTML = '<option value="">Todos los negocios</option>' +
                data.data.map(business => 
                    `<option value="${business._id}">${business.name}</option>`
                ).join('');
        }

        if (businessSelectModal) {
            businessSelectModal.innerHTML = '<option value="">Seleccionar negocio</option>' +
                data.data.map(business => 
                    `<option value="${business._id}">${business.name}</option>`
                ).join('');
        }

    } catch (error) {
        console.error('Error loading businesses for filter:', error);
    }
}

// Configurar event listeners para usuarios
function setupUserEventListeners() {
    // Event listener para formulario de usuario
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            dashboardApp.saveUser();
        });
    }

    // Event listener para formulario de reset de contraseña
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            dashboardApp.saveResetPassword();
        });
    }

    // Event listener para cambio de negocio en modal
    const userBusinessSelect = document.getElementById('userBusiness');
    if (userBusinessSelect) {
        userBusinessSelect.addEventListener('change', (e) => {
            dashboardApp.loadBranchesForUser(e.target.value);
        });
    }

    // Event listener para cambio de rol
    const userRoleSelect = document.getElementById('userRole');
    if (userRoleSelect) {
        userRoleSelect.addEventListener('change', (e) => {
            dashboardApp.generatePermissionsCheckboxes(e.target.value);
        });
    }
}

// Filtrar usuarios
function filterUsers() {
    dashboardApp.currentUserFilters = {
        role: document.getElementById('userRoleFilter')?.value || '',
        businessId: document.getElementById('userBusinessFilter')?.value || '',
        isActive: document.getElementById('userStatusFilter')?.value || '',
        search: document.getElementById('userSearch')?.value || ''
    };

    // Limpiar filtros vacíos
    Object.keys(dashboardApp.currentUserFilters).forEach(key => {
        if (!dashboardApp.currentUserFilters[key]) {
            delete dashboardApp.currentUserFilters[key];
        }
    });

    dashboardApp.loadUsersData(1);
}

// Buscar usuarios
function searchUsers() {
    filterUsers();
}

// Refrescar usuarios
function refreshUsers() {
    dashboardApp.loadUsersData(dashboardApp.currentUserPage);
    dashboardApp.loadUserStats();
}

// Exportar usuarios
function exportUsers() {
    dashboardApp.showAlert('Función de exportación en desarrollo', 'info');
}

// Abrir modal para crear usuario
function openCreateUserModal() {
    dashboardApp.currentEditingUserId = null;
    document.getElementById('userModalLabel').textContent = 'Crear Usuario';
    document.getElementById('userForm').reset();
    document.getElementById('userPassword').required = true;
    document.getElementById('userPassword').parentElement.style.display = 'block';
    
    // Generar permisos por defecto
    dashboardApp.generatePermissionsCheckboxes('staff');
    
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

// Editar usuario
async function editUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${dashboardApp.baseURL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar datos del usuario');
        }

        const data = await response.json();
        const user = data.data;

        dashboardApp.currentEditingUserId = userId;
        document.getElementById('userModalLabel').textContent = 'Editar Usuario';
        
        // Llenar formulario
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userRole').value = user.role || '';
        document.getElementById('userBusiness').value = user.businessId?._id || '';
        document.getElementById('userBranch').value = user.branchId?._id || '';
        document.getElementById('userPhone').value = user.profile?.phone || '';
        document.getElementById('userTimezone').value = user.profile?.timezone || 'America/Bogota';

        // Ocultar campo de contraseña para edición
        document.getElementById('userPassword').required = false;
        document.getElementById('userPassword').parentElement.style.display = 'none';

        // Cargar sucursales si hay negocio seleccionado
        if (user.businessId?._id) {
            await dashboardApp.loadBranchesForUser(user.businessId._id);
        }

        // Generar permisos
        dashboardApp.generatePermissionsCheckboxes(user.role, user.permissions);

        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading user data:', error);
        dashboardApp.showAlert('Error al cargar datos del usuario: ' + error.message, 'danger');
    }
}

// Guardar usuario
async function saveUser() {
    try {
        const formData = {
            name: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            businessId: document.getElementById('userBusiness').value || null,
            branchId: document.getElementById('userBranch').value || null,
            profile: {
                phone: document.getElementById('userPhone').value,
                timezone: document.getElementById('userTimezone').value
            },
            permissions: dashboardApp.getSelectedPermissions()
        };

        // Agregar contraseña solo para nuevos usuarios
        if (!dashboardApp.currentEditingUserId) {
            formData.password = document.getElementById('userPassword').value;
        }

        const token = localStorage.getItem('token');
        const url = dashboardApp.currentEditingUserId ? 
            `${dashboardApp.baseURL}/users/${dashboardApp.currentEditingUserId}` : 
            `${dashboardApp.baseURL}/users`;
        
        const method = dashboardApp.currentEditingUserId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar usuario');
        }

        const data = await response.json();
        dashboardApp.showAlert(data.message || 'Usuario guardado exitosamente', 'success');

        // Cerrar modal y recargar datos
        const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        modal.hide();
        
        dashboardApp.loadUsersData(dashboardApp.currentUserPage);
        dashboardApp.loadUserStats();

    } catch (error) {
        console.error('Error saving user:', error);
        dashboardApp.showAlert('Error al guardar usuario: ' + error.message, 'danger');
    }
}

// Cargar sucursales para usuario
async function loadBranchesForUser(businessId) {
    try {
        if (!businessId) {
            document.getElementById('userBranch').innerHTML = '<option value="">Seleccionar sucursal</option>';
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${dashboardApp.baseURL}/branch?businessId=${businessId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar sucursales');
        }

        const data = await response.json();
        const branchSelect = document.getElementById('userBranch');
        
        branchSelect.innerHTML = '<option value="">Seleccionar sucursal</option>' +
            data.data.map(branch => 
                `<option value="${branch._id}">${branch.name}</option>`
            ).join('');

    } catch (error) {
        console.error('Error loading branches for user:', error);
    }
}

// Generar checkboxes de permisos
function generatePermissionsCheckboxes(role, currentPermissions = []) {
    const permissions = [
        { key: 'manage_business', label: 'Gestionar Negocios', description: 'Crear, editar y eliminar negocios' },
        { key: 'manage_branches', label: 'Gestionar Sucursales', description: 'Crear, editar y eliminar sucursales' },
        { key: 'manage_services', label: 'Gestionar Servicios', description: 'Administrar servicios del negocio' },
        { key: 'manage_orders', label: 'Gestionar Pedidos', description: 'Ver, editar y procesar pedidos' },
        { key: 'manage_users', label: 'Gestionar Usuarios', description: 'Crear, editar y eliminar usuarios' },
        { key: 'view_reports', label: 'Ver Reportes', description: 'Acceder a reportes y estadísticas' },
        { key: 'manage_whatsapp', label: 'Gestionar WhatsApp', description: 'Configurar y gestionar WhatsApp' },
        { key: 'manage_ai', label: 'Gestionar IA', description: 'Configurar inteligencia artificial' },
        { key: 'manage_billing', label: 'Gestionar Facturación', description: 'Administrar facturación y pagos' }
    ];

    const container = document.getElementById('permissionsContainer');
    if (!container) return;
    
    container.innerHTML = '';

    permissions.forEach(permission => {
        const isChecked = currentPermissions.includes(permission.key);
        const isDisabled = role === 'super_admin'; // Super admin tiene todos los permisos

        container.innerHTML += `
            <div class="col-md-6 mb-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           id="perm_${permission.key}" 
                           value="${permission.key}"
                           ${isChecked ? 'checked' : ''}
                           ${isDisabled ? 'disabled' : ''}>
                    <label class="form-check-label" for="perm_${permission.key}">
                        <strong>${permission.label}</strong>
                        <br>
                        <small class="text-muted">${permission.description}</small>
                    </label>
                </div>
            </div>
        `;
    });
}

// Obtener permisos seleccionados
function getSelectedPermissions() {
    const checkboxes = document.querySelectorAll('#permissionsContainer input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Gestionar permisos de usuario
async function managePermissions(userId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${dashboardApp.baseURL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar datos del usuario');
        }

        const data = await response.json();
        const user = data.data;

        dashboardApp.currentEditingUserId = userId;
        
        // Generar permisos en el modal
        const container = document.getElementById('permissionsContent');
        container.innerHTML = `
            <h6>Usuario: <strong>${user.name}</strong></h6>
            <p class="text-muted">Rol: ${dashboardApp.getUserRoleText(user.role)}</p>
            <hr>
            <div class="row" id="modalPermissionsContainer">
            </div>
        `;

        // Generar checkboxes de permisos
        generatePermissionsCheckboxes(user.role, user.permissions);

        const modal = new bootstrap.Modal(document.getElementById('permissionsModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading user permissions:', error);
        dashboardApp.showAlert('Error al cargar permisos del usuario: ' + error.message, 'danger');
    }
}

// Guardar permisos de usuario
async function saveUserPermissions() {
    try {
        const permissions = getSelectedPermissions();
        const token = localStorage.getItem('token');

        const response = await fetch(`${dashboardApp.baseURL}/users/${dashboardApp.currentEditingUserId}/permissions`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permissions })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al guardar permisos');
        }

        const data = await response.json();
        dashboardApp.showAlert(data.message || 'Permisos actualizados exitosamente', 'success');

        // Cerrar modal y recargar datos
        const modal = bootstrap.Modal.getInstance(document.getElementById('permissionsModal'));
        modal.hide();
        
        dashboardApp.loadUsersData(dashboardApp.currentUserPage);

    } catch (error) {
        console.error('Error saving permissions:', error);
        dashboardApp.showAlert('Error al guardar permisos: ' + error.message, 'danger');
    }
}

// Resetear contraseña
async function resetPassword(userId) {
    dashboardApp.currentEditingUserId = userId;
    
    const modal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    modal.show();
}

// Guardar reset de contraseña
async function saveResetPassword() {
    try {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            dashboardApp.showAlert('Las contraseñas no coinciden', 'danger');
            return;
        }

        const token = localStorage.getItem('token');

        const response = await fetch(`${dashboardApp.baseURL}/users/${dashboardApp.currentEditingUserId}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al resetear contraseña');
        }

        const data = await response.json();
        dashboardApp.showAlert(data.message || 'Contraseña actualizada exitosamente', 'success');

        // Cerrar modal y limpiar formulario
        const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
        modal.hide();
        document.getElementById('resetPasswordForm').reset();

    } catch (error) {
        console.error('Error resetting password:', error);
        dashboardApp.showAlert('Error al resetear contraseña: ' + error.message, 'danger');
    }
}

// Activar/desactivar usuario
async function toggleUserStatus(userId) {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${dashboardApp.baseURL}/users/${userId}/toggle-status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cambiar estado del usuario');
        }

        const data = await response.json();
        dashboardApp.showAlert(data.message || 'Estado del usuario actualizado exitosamente', 'success');
        
        dashboardApp.loadUsersData(dashboardApp.currentUserPage);
        dashboardApp.loadUserStats();

    } catch (error) {
        console.error('Error toggling user status:', error);
        dashboardApp.showAlert('Error al cambiar estado del usuario: ' + error.message, 'danger');
    }
}

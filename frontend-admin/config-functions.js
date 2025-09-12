// ===== MÉTODOS PARA CONFIGURACIÓN DEL SISTEMA =====

// Configurar eventos de los tabs de configuración
setupConfigTabs() {
    // Inicializar tabs de Bootstrap
    const triggerTabList = document.querySelectorAll('#configTabs button[data-bs-toggle="tab"]');
    triggerTabList.forEach(triggerEl => {
        const tabTrigger = new bootstrap.Tab(triggerEl);
        triggerEl.addEventListener('click', event => {
            event.preventDefault();
            tabTrigger.show();
        });
    });
}

// Actualizar configuración del sistema
async refreshSystemConfig() {
    try {
        this.showAlert('Actualizando configuración del sistema...', 'info');
        
        // Cargar configuración actual
        await this.loadSystemConfig();
        await this.loadAIConfig();
        await this.loadWhatsAppConfig();
        await this.loadBusinessTypesConfig();
        await this.loadRolesConfig();
        
        this.showAlert('Configuración actualizada correctamente', 'success');
    } catch (error) {
        console.error('Error refreshing system config:', error);
        this.showAlert('Error al actualizar la configuración', 'danger');
    }
}

// Cargar configuración del sistema
async loadSystemConfig() {
    try {
        const response = await fetch(`${this.baseURL}/api/system/config`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Actualizar campos del formulario
            document.getElementById('environment').value = data.environment || 'development';
            document.getElementById('mongoUri').value = data.mongoUri || 'mongodb://localhost:27017/easybranch';
            
            // Actualizar estado de la base de datos
            const dbStatus = document.getElementById('dbStatus');
            if (data.databaseConnected) {
                dbStatus.className = 'badge bg-success me-2';
                dbStatus.textContent = 'Conectado';
            } else {
                dbStatus.className = 'badge bg-danger me-2';
                dbStatus.textContent = 'Desconectado';
            }
            
            // Actualizar variables de entorno
            this.updateEnvVarsTable(data.envVars || {});
        }
    } catch (error) {
        console.error('Error loading system config:', error);
    }
}

// Actualizar tabla de variables de entorno
updateEnvVarsTable(envVars) {
    const tbody = document.getElementById('envVarsTable');
    if (!tbody) return;
    
    const commonVars = [
        { key: 'JWT_SECRET', type: 'secret', label: 'Secreto' },
        { key: 'HUGGINGFACE_API_KEY', type: 'secret', label: 'Secreto' },
        { key: 'ALLOWED_ORIGINS', type: 'public', label: 'Público' },
        { key: 'NODE_ENV', type: 'public', label: 'Público' },
        { key: 'PORT', type: 'public', label: 'Público' }
    ];
    
    tbody.innerHTML = commonVars.map(variable => {
        const value = envVars[variable.key] || '';
        const displayValue = variable.type === 'secret' && value ? '••••••••' : value;
        const badgeClass = variable.type === 'secret' ? 'bg-warning' : 'bg-info';
        
        return `
            <tr>
                <td>${variable.key}</td>
                <td><input type="${variable.type === 'secret' ? 'password' : 'text'}" 
                           class="form-control form-control-sm" 
                           value="${displayValue}" 
                           data-original="${value}"></td>
                <td><span class="badge ${badgeClass}">${variable.label}</span></td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" onclick="dashboardApp.editEnvVar('${variable.key}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Probar conexión a la base de datos
async testDatabaseConnection() {
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Probando...';
        button.disabled = true;
        
        const response = await fetch(`${this.baseURL}/api/system/test-db`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showAlert('Conexión a la base de datos exitosa', 'success');
            const dbStatus = document.getElementById('dbStatus');
            dbStatus.className = 'badge bg-success me-2';
            dbStatus.textContent = 'Conectado';
        } else {
            this.showAlert('Error en la conexión a la base de datos', 'danger');
            const dbStatus = document.getElementById('dbStatus');
            dbStatus.className = 'badge bg-danger me-2';
            dbStatus.textContent = 'Desconectado';
        }
        
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('Error testing database connection:', error);
        this.showAlert('Error al probar la conexión', 'danger');
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Editar variable de entorno
editEnvVar(varName) {
    const modal = new bootstrap.Modal(document.getElementById('editEnvVarModal'));
    
    // Crear modal si no existe
    if (!document.getElementById('editEnvVarModal')) {
        this.createEnvVarModal();
    }
    
    // Configurar modal
    document.getElementById('editVarName').textContent = varName;
    document.getElementById('editVarValue').value = '';
    document.getElementById('editVarValue').placeholder = `Ingresa el nuevo valor para ${varName}`;
    
    modal.show();
}

// Crear modal para editar variables de entorno
createEnvVarModal() {
    const modalHtml = `
        <div class="modal fade" id="editEnvVarModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Editar Variable de Entorno</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Variable</label>
                            <input type="text" class="form-control" id="editVarName" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nuevo Valor</label>
                            <input type="text" class="form-control" id="editVarValue">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="dashboardApp.saveEnvVar()">Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Guardar variable de entorno
async saveEnvVar() {
    try {
        const varName = document.getElementById('editVarName').textContent;
        const varValue = document.getElementById('editVarValue').value;
        
        if (!varValue.trim()) {
            this.showAlert('El valor no puede estar vacío', 'warning');
            return;
        }
        
        const response = await fetch(`${this.baseURL}/api/system/env-var`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variable: varName,
                value: varValue
            })
        });
        
        if (response.ok) {
            this.showAlert(`Variable ${varName} actualizada correctamente`, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editEnvVarModal')).hide();
            await this.loadSystemConfig();
        } else {
            throw new Error('Error al guardar la variable');
        }
    } catch (error) {
        console.error('Error saving env var:', error);
        this.showAlert('Error al guardar la variable de entorno', 'danger');
    }
}

// Guardar configuración del sistema
async saveSystemConfig() {
    try {
        const configData = {
            environment: document.getElementById('environment').value,
            mongoUri: document.getElementById('mongoUri').value,
            backendPort: document.getElementById('backendPort').value,
            frontendPort: document.getElementById('frontendPort').value
        };
        
        const response = await fetch(`${this.baseURL}/api/system/config`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });
        
        if (response.ok) {
            this.showAlert('Configuración del sistema guardada correctamente', 'success');
        } else {
            throw new Error('Error al guardar la configuración');
        }
    } catch (error) {
        console.error('Error saving system config:', error);
        this.showAlert('Error al guardar la configuración del sistema', 'danger');
    }
}

// ===== MÉTODOS PARA CONFIGURACIÓN DE IA =====

// Cargar configuración de IA
async loadAIConfig() {
    try {
        const response = await fetch(`${this.baseURL}/api/ai/config`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Actualizar campos del formulario
            document.getElementById('aiProvider').value = data.provider || 'huggingface';
            document.getElementById('aiModel').value = data.model || 'microsoft/DialoGPT-small';
            document.getElementById('aiTemperature').value = data.temperature || 0.7;
            document.getElementById('aiEnabled').checked = data.enabled !== false;
            document.getElementById('aiAutoResponse').checked = data.autoResponse !== false;
            document.getElementById('aiLearningMode').checked = data.learningMode || false;
            document.getElementById('aiTokenLimit').value = data.tokenLimit || 1000;
            
            // Actualizar API keys
            document.getElementById('hfApiKey').value = data.providers?.huggingface?.apiKey || '';
            document.getElementById('hfModel').value = data.providers?.huggingface?.model || 'microsoft/DialoGPT-small';
            document.getElementById('openaiApiKey').value = data.providers?.openai?.apiKey || '';
            document.getElementById('openaiModel').value = data.providers?.openai?.model || 'gpt-3.5-turbo';
            document.getElementById('anthropicApiKey').value = data.providers?.anthropic?.apiKey || '';
            document.getElementById('anthropicModel').value = data.providers?.anthropic?.model || 'claude-3-sonnet';
        }
    } catch (error) {
        console.error('Error loading AI config:', error);
    }
}

// Probar proveedor de IA
async testAIProvider(provider) {
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Probando...';
        button.disabled = true;
        
        const apiKey = document.getElementById(`${provider}ApiKey`).value;
        const model = document.getElementById(`${provider}Model`).value;
        
        if (!apiKey) {
            this.showAlert('Por favor ingresa la API Key', 'warning');
            button.innerHTML = originalText;
            button.disabled = false;
            return;
        }
        
        const response = await fetch(`${this.baseURL}/api/ai/test-provider`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: provider,
                apiKey: apiKey,
                model: model
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showAlert(`Proveedor ${provider} conectado correctamente`, 'success');
        } else {
            this.showAlert(`Error con el proveedor ${provider}: ${data.error}`, 'danger');
        }
        
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('Error testing AI provider:', error);
        this.showAlert('Error al probar el proveedor de IA', 'danger');
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Guardar configuración de IA
async saveAIConfig() {
    try {
        const configData = {
            provider: document.getElementById('aiProvider').value,
            model: document.getElementById('aiModel').value,
            temperature: parseFloat(document.getElementById('aiTemperature').value),
            enabled: document.getElementById('aiEnabled').checked,
            autoResponse: document.getElementById('aiAutoResponse').checked,
            learningMode: document.getElementById('aiLearningMode').checked,
            tokenLimit: parseInt(document.getElementById('aiTokenLimit').value),
            providers: {
                huggingface: {
                    apiKey: document.getElementById('hfApiKey').value,
                    model: document.getElementById('hfModel').value
                },
                openai: {
                    apiKey: document.getElementById('openaiApiKey').value,
                    model: document.getElementById('openaiModel').value
                },
                anthropic: {
                    apiKey: document.getElementById('anthropicApiKey').value,
                    model: document.getElementById('anthropicModel').value
                }
            }
        };
        
        const response = await fetch(`${this.baseURL}/api/ai/config`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });
        
        if (response.ok) {
            this.showAlert('Configuración de IA guardada correctamente', 'success');
        } else {
            throw new Error('Error al guardar la configuración');
        }
    } catch (error) {
        console.error('Error saving AI config:', error);
        this.showAlert('Error al guardar la configuración de IA', 'danger');
    }
}

// ===== MÉTODOS PARA CONFIGURACIÓN DE WHATSAPP =====

// Cargar configuración de WhatsApp
async loadWhatsAppConfig() {
    try {
        const response = await fetch(`${this.baseURL}/api/whatsapp/config`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Actualizar campos del formulario
            document.getElementById('whatsappProvider').value = data.provider || 'whatsapp-web';
            document.getElementById('whatsappEnabled').checked = data.enabled !== false;
            document.getElementById('whatsappAutoReconnect').checked = data.autoReconnect !== false;
            document.getElementById('whatsappReconnectInterval').value = data.reconnectInterval || 30000;
            document.getElementById('whatsappSessionDir').value = data.sessionDir || './sessions';
            document.getElementById('whatsappSaveSession').checked = data.saveSession !== false;
            document.getElementById('whatsappQRTimeout').value = data.qrTimeout || 5;
            
            // Actualizar estado del servicio
            const whatsappStatus = document.getElementById('whatsappStatus');
            if (data.serviceActive) {
                whatsappStatus.className = 'badge bg-success me-2';
                whatsappStatus.textContent = 'Activo';
            } else {
                whatsappStatus.className = 'badge bg-danger me-2';
                whatsappStatus.textContent = 'Inactivo';
            }
            
            // Actualizar API keys
            document.getElementById('twilioAccountSid').value = data.providers?.twilio?.accountSid || '';
            document.getElementById('twilioAuthToken').value = data.providers?.twilio?.authToken || '';
            document.getElementById('twilioPhoneSid').value = data.providers?.twilio?.phoneSid || '';
            document.getElementById('metaAccessToken').value = data.providers?.meta?.accessToken || '';
            document.getElementById('metaPhoneId').value = data.providers?.meta?.phoneId || '';
            document.getElementById('metaBusinessId').value = data.providers?.meta?.businessId || '';
        }
    } catch (error) {
        console.error('Error loading WhatsApp config:', error);
    }
}

// Probar conexión de WhatsApp
async testWhatsAppConnection() {
    try {
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Probando...';
        button.disabled = true;
        
        const response = await fetch(`${this.baseURL}/api/whatsapp/test-connection`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.showAlert('Conexión de WhatsApp exitosa', 'success');
            const whatsappStatus = document.getElementById('whatsappStatus');
            whatsappStatus.className = 'badge bg-success me-2';
            whatsappStatus.textContent = 'Activo';
        } else {
            this.showAlert('Error en la conexión de WhatsApp', 'danger');
            const whatsappStatus = document.getElementById('whatsappStatus');
            whatsappStatus.className = 'badge bg-danger me-2';
            whatsappStatus.textContent = 'Inactivo';
        }
        
        button.innerHTML = originalText;
        button.disabled = false;
    } catch (error) {
        console.error('Error testing WhatsApp connection:', error);
        this.showAlert('Error al probar la conexión de WhatsApp', 'danger');
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Guardar configuración de WhatsApp
async saveWhatsAppConfig() {
    try {
        const configData = {
            provider: document.getElementById('whatsappProvider').value,
            enabled: document.getElementById('whatsappEnabled').checked,
            autoReconnect: document.getElementById('whatsappAutoReconnect').checked,
            reconnectInterval: parseInt(document.getElementById('whatsappReconnectInterval').value),
            sessionDir: document.getElementById('whatsappSessionDir').value,
            saveSession: document.getElementById('whatsappSaveSession').checked,
            qrTimeout: parseInt(document.getElementById('whatsappQRTimeout').value),
            providers: {
                twilio: {
                    accountSid: document.getElementById('twilioAccountSid').value,
                    authToken: document.getElementById('twilioAuthToken').value,
                    phoneSid: document.getElementById('twilioPhoneSid').value
                },
                meta: {
                    accessToken: document.getElementById('metaAccessToken').value,
                    phoneId: document.getElementById('metaPhoneId').value,
                    businessId: document.getElementById('metaBusinessId').value
                }
            }
        };
        
        const response = await fetch(`${this.baseURL}/api/whatsapp/config`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configData)
        });
        
        if (response.ok) {
            this.showAlert('Configuración de WhatsApp guardada correctamente', 'success');
        } else {
            throw new Error('Error al guardar la configuración');
        }
    } catch (error) {
        console.error('Error saving WhatsApp config:', error);
        this.showAlert('Error al guardar la configuración de WhatsApp', 'danger');
    }
}

// ===== MÉTODOS PARA CONFIGURACIÓN DE TIPOS DE NEGOCIO =====

// Cargar configuración de tipos de negocio
async loadBusinessTypesConfig() {
    try {
        const response = await fetch(`${this.baseURL}/api/business-types`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            this.updateBusinessTypesTable(data.businessTypes || []);
        }
    } catch (error) {
        console.error('Error loading business types config:', error);
    }
}

// Actualizar tabla de tipos de negocio
updateBusinessTypesTable(businessTypes) {
    const tbody = document.getElementById('businessTypesTable');
    if (!tbody) return;
    
    tbody.innerHTML = businessTypes.map(type => {
        const iconClass = this.getBusinessTypeIcon(type.type);
        const badgeClass = type.configured ? 'bg-success' : 'bg-secondary';
        const badgeText = type.configured ? 'Configurado' : 'Sin configurar';
        
        return `
            <tr>
                <td><i class="${iconClass}"></i></td>
                <td>${type.name}</td>
                <td>${type.description}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" onclick="dashboardApp.editBusinessType('${type.type}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Obtener icono para tipo de negocio
getBusinessTypeIcon(type) {
    const icons = {
        'restaurant': 'fas fa-utensils text-primary',
        'cafe': 'fas fa-coffee text-warning',
        'pharmacy': 'fas fa-pills text-success',
        'store': 'fas fa-shopping-cart text-info',
        'hotel': 'fas fa-bed text-secondary',
        'gym': 'fas fa-dumbbell text-danger'
    };
    return icons[type] || 'fas fa-building text-muted';
}

// Editar tipo de negocio
editBusinessType(type) {
    // Implementar modal para editar tipo de negocio
    this.showAlert(`Editando configuración para ${type}`, 'info');
}

// Agregar tipo de negocio
addBusinessType() {
    // Implementar modal para agregar tipo de negocio
    this.showAlert('Funcionalidad para agregar tipo de negocio en desarrollo', 'info');
}

// ===== MÉTODOS PARA CONFIGURACIÓN DE USUARIOS Y ROLES =====

// Cargar configuración de roles
async loadRolesConfig() {
    try {
        const response = await fetch(`${this.baseURL}/api/roles`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            this.updateRolesTable(data.roles || []);
        }
    } catch (error) {
        console.error('Error loading roles config:', error);
    }
}

// Actualizar tabla de roles
updateRolesTable(roles) {
    const tbody = document.getElementById('rolesTable');
    if (!tbody) return;
    
    tbody.innerHTML = roles.map(role => {
        const badgeClass = this.getRoleBadgeClass(role.name);
        
        return `
            <tr>
                <td><span class="badge ${badgeClass}">${role.displayName}</span></td>
                <td>${role.description}</td>
                <td>${role.userCount} usuarios</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" onclick="dashboardApp.editRole('${role.name}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Obtener clase de badge para rol
getRoleBadgeClass(roleName) {
    const badgeClasses = {
        'super_admin': 'bg-danger',
        'business_admin': 'bg-warning',
        'branch_admin': 'bg-info',
        'user': 'bg-secondary'
    };
    return badgeClasses[roleName] || 'bg-secondary';
}

// Editar rol
editRole(roleName) {
    // Implementar modal para editar permisos del rol
    this.showAlert(`Editando permisos para ${roleName}`, 'info');
    this.loadRolePermissions(roleName);
}

// Cargar permisos del rol
loadRolePermissions(roleName) {
    const permissionsContainer = document.getElementById('rolePermissions');
    if (!permissionsContainer) return;
    
    const permissions = {
        'super_admin': ['system-config', 'business-management', 'user-management', 'whatsapp-config', 'ai-config', 'reports', 'billing'],
        'business_admin': ['business-management', 'whatsapp-config', 'ai-config', 'reports'],
        'branch_admin': ['whatsapp-config', 'ai-config'],
        'user': []
    };
    
    const rolePermissions = permissions[roleName] || [];
    
    permissionsContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0">${this.getRoleDisplayName(roleName)}</h6>
            </div>
            <div class="card-body">
                ${this.generatePermissionCheckboxes(rolePermissions, roleName)}
            </div>
        </div>
    `;
}

// Obtener nombre de visualización del rol
getRoleDisplayName(roleName) {
    const displayNames = {
        'super_admin': 'Super Admin',
        'business_admin': 'Business Admin',
        'branch_admin': 'Branch Admin',
        'user': 'Usuario'
    };
    return displayNames[roleName] || roleName;
}

// Generar checkboxes de permisos
generatePermissionCheckboxes(permissions, roleName) {
    const allPermissions = [
        { id: 'system-config', label: 'Configuración del Sistema' },
        { id: 'business-management', label: 'Gestión de Negocios' },
        { id: 'user-management', label: 'Gestión de Usuarios' },
        { id: 'whatsapp-config', label: 'Configuración WhatsApp' },
        { id: 'ai-config', label: 'Configuración IA' },
        { id: 'reports', label: 'Reportes' },
        { id: 'billing', label: 'Facturación' }
    ];
    
    return allPermissions.map(permission => {
        const isChecked = permissions.includes(permission.id);
        const isDisabled = roleName === 'super_admin'; // Super admin tiene todos los permisos
        
        return `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" 
                       id="perm-${permission.id}" 
                       ${isChecked ? 'checked' : ''} 
                       ${isDisabled ? 'disabled' : ''}>
                <label class="form-check-label" for="perm-${permission.id}">
                    ${permission.label}
                </label>
            </div>
        `;
    }).join('');
}

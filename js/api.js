/* ============================================
   LUCKY DIAGNOSTICS — API LAYER
   ============================================ */
const API = {
    async request(action, data = {}) {
        if (!APP_CONFIG.API_URL || APP_CONFIG.API_URL.includes('YOUR_DEPLOYMENT_ID')) {
            return { success: false, message: 'API not configured' };
        }

        const S = (typeof getSession === 'function') ? getSession() : null;
        
        const payload = {
            action: action,
            data: data,
            session_token: S ? S.token : null,
            user_id: S ? S.user_id : null,
            role: S ? S.role : 'customer'
        };

        if (S && S.token) {
            if (!payload.data) payload.data = {};
            payload.data._token = S.token;
        }

        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', APP_CONFIG.API_URL, true);
            xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
            
            xhr.onload = function() {
                if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
                    try {
                        const json = JSON.parse(xhr.responseText);
                        resolve(json);
                    } catch (e) {
                        resolve({ success: false, message: 'Invalid response format' });
                    }
                } else {
                    resolve({ success: false, message: `HTTP error ${xhr.status}` });
                }
            };
            
            xhr.onerror = function() {
                resolve({ success: false, message: 'Network error' });
            };
            
            xhr.ontimeout = function() {
                resolve({ success: false, message: 'Request timeout' });
            };
            
            xhr.timeout = 30000;
            xhr.send(JSON.stringify(payload));
        });
    },

    async getTests()      { return this.request('getTests'); },
    async getTest(slug)   { return this.request('getTest', { slug }); },
    async getPackages()   { return this.request('getPackages'); },
    async getPackage(slug){ return this.request('getPackage', { slug }); },
    async getCategories() { return this.request('getCategories'); },
    async getArticles()   { return this.request('getArticles'); },
    async getArticle(slug){ return this.request('getArticle', { slug }); },
    async sendOtp(data)   { return this.request('sendOtp', data); },
    async verifyOtp(data) { return this.request('verifyOtp', data); },
    async getUser()       { return this.request('getUser'); },
    async registerUser(d) { return this.request('registerUser', d); },
    async getBookings()   { return this.request('getBookings'); },
    async createBooking(d){ return this.request('createBooking', d); },
    async getReports()    { return this.request('getReports'); },
    async getReportUrl(d) { return this.request('getReportUrl', d); },
    async getPrescriptions() { return this.request('getPrescriptions'); },
    async uploadprescription(d) { return this.request('uploadprescription', d); },
    async getFamily()     { return this.request('getFamily'); },
    async addFamily(d)    { return this.request('addFamily', d); },
    async validatePromo(d){ return this.request('validatePromo', d); }
};

window.API = API;
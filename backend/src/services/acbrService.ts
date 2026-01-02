import net from 'net';
import { queryOne } from '../config/database.js';

export interface ACBrResponse {
    success: boolean;
    message: string;
    data?: any;
}

class ACBrService {
    private async getSettings() {
        const acbrSetting = await queryOne("SELECT value FROM settings WHERE key = 'acbr'");
        const settings = acbrSetting ? JSON.parse(acbrSetting.value) : { host: 'localhost', port: 3434 };

        return {
            host: settings.host || 'localhost',
            port: settings.port || 3434
        };
    }

    async sendCommand(command: string): Promise<string> {
        const { host, port } = await this.getSettings();

        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            let response = '';

            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('ACBr Monitor timeout'));
            }, 10000);

            client.connect(port, host, () => {
                client.write(command + '\r\n.\r\n');
            });

            client.on('data', (data) => {
                response += data.toString();
                // ACBr Monitor responses end with \r\n.\r\n
                if (response.includes('\r\n.\r\n')) {
                    clearTimeout(timeout);
                    client.destroy();
                    resolve(response.replace('\r\n.\r\n', '').trim());
                }
            });

            client.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    async checkStatus(): Promise<ACBrResponse> {
        try {
            const response = await this.sendCommand('NFE.Ativo');
            return {
                success: response.toUpperCase().includes('OK'),
                message: response
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async createNFe(iniContent: string): Promise<ACBrResponse> {
        try {
            // ACBr uses INI format for creating NFe
            const response = await this.sendCommand(`NFE.CriarEnviarNFe("${iniContent}", 1, "1", "1")`);
            return {
                success: response.toUpperCase().includes('OK'),
                message: response
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async createNFCe(iniContent: string): Promise<ACBrResponse> {
        try {
            // NFCe is similar to NFe in ACBr Monitor
            const response = await this.sendCommand(`NFE.CriarEnviarNFe("${iniContent}", 1, "1", "1")`);
            return {
                success: response.toUpperCase().includes('OK'),
                message: response
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async imprimirDANFE(xmlPath: string): Promise<ACBrResponse> {
        try {
            const response = await this.sendCommand(`NFE.ImprimirDANFE("${xmlPath}")`);
            return {
                success: response.toUpperCase().includes('OK'),
                message: response
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

export const acbrService = new ACBrService();

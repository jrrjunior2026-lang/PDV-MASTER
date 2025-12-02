
export const PixService = {
  /**
   * Generates the BR Code (Copy and Paste string) for PIX payment
   * Compliant with EMV QRCPS (Banco Central standard)
   */
  generatePayload: (pixKey: string, name: string, city: string, txId: string, amount: number): string => {
    // Normalization
    const merchantName = name.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const merchantCity = city.substring(0, 15).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const formattedAmount = amount.toFixed(2);
    
    // Helper to build TLV (Type-Length-Value)
    const format = (id: string, value: string) => {
      const len = value.length.toString().padStart(2, '0');
      return `${id}${len}${value}`;
    };

    // 1. Header & Version
    let payload = format('00', '01'); // Format Indicator
    
    // 2. Merchant Account Information (GUI + Key)
    const gui = format('00', 'br.gov.bcb.pix');
    const key = format('01', pixKey);
    payload += format('26', gui + key);

    // 3. Merchant Category Code
    payload += format('52', '0000'); // General

    // 4. Transaction Currency (BRL = 986)
    payload += format('53', '986');

    // 5. Transaction Amount
    payload += format('54', formattedAmount);

    // 6. Country Code
    payload += format('58', 'BR');

    // 7. Merchant Name
    payload += format('59', merchantName);

    // 8. Merchant City
    payload += format('60', merchantCity);

    // 9. Additional Data Field (TxID)
    const txIdField = format('05', txId || '***');
    payload += format('62', txIdField);

    // 10. CRC16 Calculation
    payload += '6304'; // Append CRC ID and Length
    
    const crc = PixService.calculateCRC16(payload);
    return payload + crc;
  },

  calculateCRC16: (payload: string): string => {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }
};

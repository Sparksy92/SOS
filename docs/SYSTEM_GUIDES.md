# SurvivalOS Advanced Offline Systems Deployment & Hardware Guides

This handbook provides instructions for assembling, flashing, wiring, and configuring physical hardware systems to run alongside **SurvivalOS** in a completely grid-down scenario.

---

## 1. Meshtastic (LoRa Mesh) Node Assembly & Configuration

Meshtastic is a decentralized, off-grid communication system that uses LPD/SRD radio bands (915 MHz in US, 868 MHz in EU) to transmit text messages and GPS coordinates between devices.

### Recommended Hardware
1.  **Radio Board:** LILYGO T-Beam v1.1 or Heltec V3 (ESP32-based).
2.  **Antenna:** 915 MHz/868 MHz dipole or colinear high-gain antenna (e.g., 3dBi to 5dBi) for base station use.
3.  **Battery:** High-quality flat-top 18650 Lithium-Ion cell (for T-Beam).

### Flashing Firmware
1.  Connect your Heltec/T-Beam node to your PC using a USB data cable.
2.  Open the web browser to [flasher.meshtastic.org](https://flasher.meshtastic.org).
3.  Select your board type, click **Detect**, choose the latest stable release, and flash the firmware.

### Connection & Integration in SurvivalOS
*   **Wi-Fi Connection:** Connect the node to your local off-grid Wi-Fi network. Retrieve its local IP address (e.g. `192.168.1.150`).
*   **SurvivalOS Setup:** Open the settings panel, locate the **Meshtastic IP** field, input the IP address, and click save. The app will immediately start polling node lists and tracking patrol team waypoints on the **Tactical Map**.

---

## 2. Solar Storage & Battery Reserves Math

Calculating off-grid electrical metrics prevents deep battery discharge and ensures uninterrupted server/device runtimes.

### Key Calculation Formulas
*   **Total Capacity (Wh):** 
    \[\text{Wh} = \text{Amp-Hours (Ah)} \times \text{Nominal Voltage (V)}\]
*   **Usable Capacity (Wh):**
    *   *LiFePO4 Chemistry:* Usable at 80% Depth of Discharge (DoD) without cell damage:
        \[\text{Usable Wh} = \text{Wh} \times 0.8\]
    *   *Lead-Acid/AGM Chemistry:* Usable at 50% DoD:
        \[\text{Usable Wh} = \text{Wh} \times 0.5\]
*   **Runtime Estimate (Hours):**
    \[\text{Runtime (h)} = \frac{\text{Usable Capacity (Wh)}}{\text{Continuous Load (W)}}\]

### Wiring Panel Arrays
1.  **Series Wiring (Increases Voltage):** Connect positive terminal of panel 1 to negative terminal of panel 2. Keep amperage the same. (Use for MPPT controllers).
2.  **Parallel Wiring (Increases Amperage):** Connect positive to positive, and negative to negative. Keep voltage the same. (Use for PWM controllers or to mitigate shade issues).

---

## 3. Local Wi-Fi Hosting via Nginx (LAN Sync)

To use SurvivalOS on your phone, tablet, and PC concurrently over a local Wi-Fi router (no internet required):

### Steps to Deploy
1.  **Find Your Local IP Address:**
    *   *Linux/macOS:* Open terminal and run `ip route show` or `ifconfig`. Look for `inet 192.168.X.X`.
    *   *Windows:* Open Command Prompt and run `ipconfig`. Look for `IPv4 Address`.
2.  **Configure Nginx:**
    *   Install Nginx (`sudo apt install nginx` on Linux).
    *   Copy the template [nginx-lan-setup.conf](file:///home/bs/projects/survival/docs/networking/nginx-lan-setup.conf) to `/etc/nginx/sites-available/survivalos`.
    *   Open the file and update `server_name` with your local IP address, and `root` with the absolute path to your compiled Vite assets (`sos-app/dist`).
3.  **Start Nginx:**
    *   Symlink to enabled sites: `sudo ln -s /etc/nginx/sites-available/survivalos /etc/nginx/sites-enabled/`.
    *   Test configuration: `sudo nginx -t`.
    *   Restart Nginx: `sudo systemctl restart nginx`.
4.  **Connect Devices:**
    *   Ensure your phone is on the same local Wi-Fi network.
    *   Open your mobile browser and navigate to `http://<your-local-ip-address>`. You will be greeted by the full SurvivalOS control panel, synced with the PC server!

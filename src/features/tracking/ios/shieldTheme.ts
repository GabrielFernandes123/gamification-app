import { Asset } from 'expo-asset';
import * as DeviceActivity from 'react-native-device-activity';

import { colors } from '@/theme/colors';

/**
 * Aparência da tela de bloqueio.
 *
 * O LAYOUT é da Apple e não se mexe (ícone, título, subtítulo, dois botões,
 * nessa ordem). Só dá para preencher cores, textos e o ícone — é uma extension
 * de configuração, não uma tela nossa. Aqui centralizamos esses valores para a
 * tela de bloqueio parecer com o app em vez do azul padrão do sistema.
 */

/** `#RRGGBB` → o UIColor que a lib espera (canais 0-255). */
function hexToUIColor(hex: string, alpha = 1) {
  const value = hex.replace('#', '');
  return {
    red: parseInt(value.slice(0, 2), 16),
    green: parseInt(value.slice(2, 4), 16),
    blue: parseInt(value.slice(4, 6), 16),
    alpha,
  };
}

/** Nome do arquivo dentro do App Group (a extension lê por caminho relativo). */
const ICON_FILE = 'shield-icon.png';

/** SF Symbol usado enquanto a logo não estiver no App Group. */
const FALLBACK_SYMBOL = 'hourglass';

let iconReady: boolean | null = null;

/**
 * Copia a logo do app para o App Group, de onde a extension consegue lê-la.
 *
 * A extension não acessa o bundle do app, só o container compartilhado — por
 * isso a cópia. Em desenvolvimento o asset é servido pelo Metro, então
 * `downloadAsync` primeiro o materializa em disco. Roda uma vez por instalação;
 * falha aqui não é fatal, só cai no SF Symbol.
 */
export async function ensureShieldIcon(): Promise<boolean> {
  if (iconReady !== null) return iconReady;
  try {
    const directory = DeviceActivity.getAppGroupFileDirectory();
    if (!directory) {
      iconReady = false;
      return false;
    }
    const asset = Asset.fromModule(require('../../../../assets/logo.png'));
    await asset.downloadAsync();
    if (!asset.localUri) {
      iconReady = false;
      return false;
    }
    DeviceActivity.copyFile(asset.localUri, `${directory}/${ICON_FILE}`, true);
    iconReady = true;
  } catch {
    iconReady = false;
  }
  return iconReady;
}

/**
 * Parte visual comum a todas as telas de bloqueio. `withUnlockButton` controla
 * se o botão secundário recebe cor — sem saldo ele não existe.
 */
export function shieldAppearance(hasIcon: boolean) {
  return {
    backgroundColor: hexToUIColor(colors.bg),
    backgroundBlurStyle: DeviceActivity.UIBlurEffectStyle.dark,
    titleColor: hexToUIColor(colors.text),
    subtitleColor: hexToUIColor(colors.textMuted),
    // logo quando disponível; SF Symbol tingido de laranja como reserva
    ...(hasIcon
      ? { iconAppGroupRelativePath: ICON_FILE }
      : { iconSystemName: FALLBACK_SYMBOL, iconTint: hexToUIColor(colors.primary) }),
    primaryButtonLabelColor: hexToUIColor(colors.bg),
    primaryButtonBackgroundColor: hexToUIColor(colors.primary),
    secondaryButtonLabelColor: hexToUIColor(colors.textMuted),
  };
}

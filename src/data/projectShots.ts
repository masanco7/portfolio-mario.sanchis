import type { ImageMetadata } from 'astro';

import tallerappLogin from '../assets/projects/tallerapp/cap-login.png';
import tallerappDashboard from '../assets/projects/tallerapp/cap-dashboard.png';
import tallerappFactura from '../assets/projects/tallerapp/cap-factura.png';
import tallerappInventario from '../assets/projects/tallerapp/cap-inventario.png';
import tallerappOrdenes from '../assets/projects/tallerapp/cap-ordenes.png';
import tallerappModoOscuro from '../assets/projects/tallerapp/cap-modo-oscuro.png';

import gymLogin from '../assets/projects/gym-tracker/Login-Web.png';
import gymLoginPhone from '../assets/projects/gym-tracker/Login-Movil.jpeg';
import gymHoy from '../assets/projects/gym-tracker/Hoy-Web.png';
import gymHistorial from '../assets/projects/gym-tracker/Historial-Web.png';
import gymRutinas from '../assets/projects/gym-tracker/Rutinas-Web.png';
import gymEjercicios from '../assets/projects/gym-tracker/Ejercicios-Web.png';
import gymCoach from '../assets/projects/gym-tracker/Coach-Web.png';
import gymProgreso from '../assets/projects/gym-tracker/Progreso-Web.png';
import gymPerfil from '../assets/projects/gym-tracker/Perfil-Web.png';

import polybotLogin from '../assets/projects/polybot/Login-Web.png';
import polybotLoginPhone from '../assets/projects/polybot/Login-Movil.jpeg';
import polybotDashboard from '../assets/projects/polybot/Dashboard-Web.png';
import polybotRanking from '../assets/projects/polybot/Ranking-Web.png';
import polybotSalud from '../assets/projects/polybot/Salud-Web.png';
import polybotAvisos from '../assets/projects/polybot/Avisos-Web.png';
import polybotSistema from '../assets/projects/polybot/Sistema-Web.png';

/**
 * Screenshots per project, keyed by project id and then by shot name.
 * Language-independent on purpose: the alt text lives with the copy in
 * projectDetails.{es,en}.ts, the bitmap lives here once.
 *
 * Adding a project = drop the PNGs in src/assets/projects/<id>/, import
 * them here and add the matching entry in both projectDetails files.
 */
export const projectShots: Record<string, Record<string, ImageMetadata>> = {
  tallerapp: {
    login: tallerappLogin,
    dashboard: tallerappDashboard,
    factura: tallerappFactura,
    inventario: tallerappInventario,
    ordenes: tallerappOrdenes,
    'modo-oscuro': tallerappModoOscuro,
  },
  'gym-tracker': {
    login: gymLogin,
    'login-phone': gymLoginPhone,
    hoy: gymHoy,
    historial: gymHistorial,
    rutinas: gymRutinas,
    ejercicios: gymEjercicios,
    coach: gymCoach,
    progreso: gymProgreso,
    perfil: gymPerfil,
  },
  /**
   * POLYBOT ships fewer shots than screens on purpose: it trades real money, so
   * screens that would expose a strategy parameter get no capture and are
   * documented in text instead (see `placeholder` in projectDetails).
   * Every capture here was taken with the dashboard's privacy mode on.
   */
  polybot: {
    login: polybotLogin,
    'login-phone': polybotLoginPhone,
    dashboard: polybotDashboard,
    ranking: polybotRanking,
    salud: polybotSalud,
    avisos: polybotAvisos,
    sistema: polybotSistema,
  },
};

export function getShot(projectId: string, shot: string): ImageMetadata | undefined {
  return projectShots[projectId]?.[shot];
}

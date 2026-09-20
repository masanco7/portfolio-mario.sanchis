<!--
  Plantilla obligatoria. Copiar a .github/PULL_REQUEST_TEMPLATE.md en cada repositorio.
  Un PR con secciones vacías o con marcadores sin rellenar se cierra sin auditar.
  Contrato completo: AGENCIA-IA/CONTRATO-PR.md
-->

## Ticket

<!-- ID del ticket. Debe coincidir con el título del PR y con la rama. -->

`XX-000` — enlace al issue:

## Directriz original del Chairman (literal)

<!--
  Copia EXACTA de lo que pidió Mario, sin reformular ni resumir.
  Si el ticket nació de un sensor (Novedades / Innovator) y no de una directriz directa,
  escribir "Origen: sensor <nombre>" y enlazar el issue que lo generó.
-->

> 

## Qué hace este cambio

<!-- Dos o tres frases. Qué cambia de comportamiento, no qué ficheros se tocan. -->

## Criterios de aceptación

<!-- Copiados del ticket. Comprobables, no aspiracionales. -->

- [ ] 
- [ ] 

## Alcance

**Ficheros tocados:**

<!-- Lista. Debe coincidir con el diff. -->

**Fuera de alcance (declarado en el ticket, no tocado):**

<!-- Si ha habido que salirse del alcance, este PR no debería existir: hay que escalar. -->

## Clase de cambio

<!-- Marcar una. Determina si el merge y el despliegue pueden ir sin aprobación humana. -->

- [ ] 🟢 **Verde** — docs, copy/i18n, tests, formateo, bump *patch*
- [ ] 🟡 **Ámbar** — feature B2C sin tocar auth, BD ni pagos; UI; endpoint nuevo no destructivo
- [ ] 🔴 **Rojo** — migración de BD, secretos, auth, infra/edge-proxy, **cambios bajo `.github/`**, sizing o bankroll de Polybot, dependencia *major*, borrado de datos, publicación externa

## Tests

**Qué falla antes:**

<!-- Nombre del test y el error que produce en el commit padre. -->

**Qué pasa después:**

**Comando para reproducirlo:**

```bash

```

## Riesgos y rollback

**Qué se rompe si esto está mal:**

**Cómo se deshace:**

<!-- Procedimiento exacto. "Revertir el commit" solo vale si de verdad basta con eso. -->

## Verificación en producción

<!--
  El comando o comprobación concreta que el auditor de producción ejecutará en
  masancoserver tras el despliegue. Si no hay forma de verificarlo, decirlo.
-->

```bash

```

## Requiere secretos o sudo

- [ ] No
- [ ] Sí — detalle:

<!--
  Si es que sí, el runner NO lo ejecuta. Listar aquí el bloque de comandos exacto
  para que lo ejecute Mario.
-->

## Requisitos extra por clase roja

<!-- Borrar esta sección si el cambio no es rojo. -->

- [ ] **Migración de BD:** dump previo verificado + script de rollback probado en local
- [ ] **Secretos/auth:** ningún secreto aparece en el diff
- [ ] **Infra:** plan de recuperación si caen los 5 servicios
- [ ] **Polybot:** `sim=true` durante ____ días antes de dinero real. Backtest: ____ → ____
- [ ] **Dependencia major:** breaking changes que aplican, resumidos:
- [ ] **Publicación externa:** la publica una persona, no un agente

---

<!--
  Checklist de forma. La CI comprueba todo esto; está aquí para que el escuadrón
  no abra un PR que va a ser rechazado sin leerse.
-->

- [ ] ≤ 400 líneas modificadas
- [ ] Un solo asunto
- [ ] Rama `<ID>-<slug>`, título `<ID>: <descripción>`
- [ ] Commits con trailer `Ticket: XX-000`
- [ ] Ficheros en UTF-8, timestamps con `Europe/Madrid`
- [ ] Bit de ejecución conservado en los scripts
- [ ] CI en verde

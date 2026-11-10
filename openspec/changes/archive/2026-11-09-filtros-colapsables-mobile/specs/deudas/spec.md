# Spec Delta: Deudas

## Purpose

Que los diálogos del módulo Deudas (alta y edición, visualización, pago, reversión, división de
gasto y agentes) sean usables desde un teléfono: no exceden la ventana visible, hacen scroll por
su cuenta y no esconden sus acciones detrás de la barra de inicio del dispositivo.

## ADDED Requirements

### Requirement: Los diálogos de Deudas caben en la ventana mobile

Los diálogos de Deudas DEBEN (SHALL) limitar su alto al 90 % del viewport dinámico y hacer scroll
su propio contenido en lugar de agrandar la página. Su base DEBE (SHALL) reservar el área segura
inferior del dispositivo para que los botones de acción NO DEBAN (SHALL NOT) quedar cubiertos por
la barra de inicio.

#### Scenario: Diálogo largo en teléfono

- **WHEN** se abre el formulario de deuda en 375 × 667 px con todos los campos visibles
- **THEN** el diálogo ocupa como máximo el 90 % de la ventana y sus campos scrollean dentro de él

#### Scenario: Acciones sobre el área segura

- **WHEN** un dispositivo con barra de inicio abre el diálogo de pago de una deuda
- **THEN** el botón de confirmación queda legible y tocable, con padding extra sobre la barra

# SPDX-License-Identifier: MIT
"""Seis pruebas base del editor real en Chromium, completamente sin red."""
from pathlib import Path
import shutil
import unittest
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

class BaseEditorTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  browser=shutil.which('chromium') or shutil.which('google-chrome')
  cls.b=cls.pw.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':browser} if browser else {}))
  cls.html=(ROOT/'AB-GRAFCET-Studio-PORTABLE.html').read_text(encoding='utf-8')
 @classmethod
 def tearDownClass(cls):cls.b.close();cls.pw.stop()
 def setUp(self):
  self.p= self.b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
  self.errors=[];self.requests=[]
  self.p.on('pageerror',lambda e:self.errors.append(str(e)))
  self.p.on('request',lambda r:self.requests.append(r.url))
  self.p.set_content(self.html,wait_until='domcontentloaded')
 def tearDown(self):
  self.assertEqual(self.errors,[]);self.assertEqual(self.requests,[]);self.p.close()
 def test_initial_diagram(self):
  self.assertEqual(self.p.locator('.stage').count(),4)
  self.assertEqual(self.p.locator('.transition').count(),4)
  self.assertEqual(self.p.locator('#active-label').inner_text(),'E0')
 def test_step_and_reset(self):
  self.p.locator('.signal-row',has_text='marcha').click();self.p.locator('#step').click()
  self.assertEqual(self.p.locator('#active-label').inner_text(),'E1')
  self.p.locator('.signal-row',has_text='carga_terminada').click();self.p.locator('#step').click()
  self.assertEqual(self.p.locator('#active-label').inner_text(),'E2')
  self.p.locator('#reset').click();self.assertEqual(self.p.locator('#active-label').inner_text(),'E0')
 def test_edit_stage_and_transition(self):
  self.p.locator('#add-stage').click()
  self.assertEqual(self.p.locator('.stage').count(),5)
  self.p.locator('#edit-name').fill('Control visual')
  self.p.locator('#edit-actions').fill('CAMARA_OK, ALARMA')
  self.p.locator('#inspector-content .primary').click()
  self.assertIn('Control visual',self.p.locator('#diagram').text_content())
  self.p.locator('#add-transition').click()
  self.p.locator('#edit-condition').fill('sensor_prueba OR NOT fallo')
  self.p.locator('#inspector-content .primary').click()
  self.assertIn('sensor_prueba',self.p.locator('#inputs').inner_text())
 def test_invalid_edit_rejected(self):
  self.p.locator('#add-transition').click()
  self.p.locator('#edit-to').fill('E404')
  self.p.locator('#inspector-content .primary').click()
  self.assertIn('inválidas',self.p.locator('#notice').inner_text())
  self.assertEqual(self.p.locator('.transition').count(),5)
 def test_download_json_svg_csv(self):
  for selector,extension in (('#save-project','.json'),('#export-svg','.svg'),('#export-log','.csv')):
   with self.p.expect_download() as d:self.p.locator(selector).click()
   self.assertTrue(d.value.suggested_filename.endswith(extension))
 def test_mobile_no_page_overflow(self):
  self.p.set_viewport_size({'width':390,'height':844})
  self.assertFalse(self.p.evaluate('document.documentElement.scrollWidth > innerWidth'))
  self.p.locator('.signal-row',has_text='marcha').click();self.p.locator('#step').click()
  self.assertEqual(self.p.locator('#active-label').inner_text(),'E1')

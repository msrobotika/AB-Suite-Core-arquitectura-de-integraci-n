import unittest
from ab_serial.protocol import crc16,append_crc,decode_rtu,RTUCollector

class ProtocolTests(unittest.TestCase):
    def test_standard_request_vector(self):
        self.assertEqual(append_crc(bytes.fromhex('01 03 00 00 00 0A')).hex(' ').upper(),'01 03 00 00 00 0A C5 CD')
    def test_read_request(self):
        r=decode_rtu(append_crc(bytes.fromhex('01 03 00 10 00 02')))
        self.assertTrue(r['valid']);self.assertEqual(r['kind'],'solicitud de lectura');self.assertEqual(r['address'],16)
    def test_register_response(self):
        r=decode_rtu(append_crc(bytes.fromhex('01 03 04 00 E6 05 DC')))
        self.assertEqual(r['values'],[230,1500]);self.assertTrue(r['valid'])
    def test_bits_response(self):
        r=decode_rtu(append_crc(bytes.fromhex('01 01 01 55')))
        self.assertEqual(r['values'][:8],[1,0,1,0,1,0,1,0])
    def test_exception(self):
        r=decode_rtu(append_crc(bytes.fromhex('01 83 02')))
        self.assertTrue(r['valid']);self.assertEqual(r['exception'],2)
    def test_crc_error(self):
        raw=append_crc(bytes.fromhex('01 03 00 00 00 01'))
        r=decode_rtu(raw[:-1]+bytes([raw[-1]^1]))
        self.assertFalse(r['valid']);self.assertEqual(r['kind'],'error CRC')
    def test_malformed_and_short(self):
        self.assertFalse(decode_rtu(b'abc')['valid'])
        r=decode_rtu(append_crc(bytes.fromhex('01 03 03 11 22 33')))
        self.assertFalse(r['valid'])
    def test_write_observation_no_write(self):
        r=decode_rtu(append_crc(bytes.fromhex('01 06 00 01 00 05')))
        self.assertTrue(r['valid']);self.assertIn('escritura',r['kind'])
    def test_gap_fragmentation(self):
        c=RTUCollector(baud=9600)
        a=append_crc(bytes.fromhex('01 03 00 00 00 02'))
        self.assertEqual(c.feed(a[:3],0),[]);self.assertEqual(c.feed(a[3:],.001),[])
        self.assertEqual(c.flush_if_idle(.009),[a]);self.assertEqual(c.flush_if_idle(1),[])
    def test_bad_length(self):
        with self.assertRaises(ValueError):append_crc(b'')
        self.assertFalse(decode_rtu(bytes([1,3])+b'\0'*255)['valid'])

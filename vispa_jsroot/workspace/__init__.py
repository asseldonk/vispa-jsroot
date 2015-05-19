from subprocess import Popen
import array
import fcntl
import os
import pty
import select
import termios
import threading
import logging

import vispa.remote

logger = logging.getLogger(__name__)


class Terminal(object):

    def __init__(self):
        self.__masterpty = None

    def open(self, window_id, view_id, shell=None):
        shell = shell or "/bin/bash"
        env = os.environ.copy()
        env["TERM"] = "xterm"
        self.__masterpty, self.__slavepty = pty.openpty()
        self.__master_stdout = os.fdopen(self.__masterpty, "r")
        self.__master_stdin = os.fdopen(self.__masterpty, "w")
        self.__process = Popen([shell, '-l', '-i'],
                               stdin=self.__slavepty,
                               stdout=self.__slavepty,
                               stderr=self.__slavepty,
                               env=env,
                               preexec_fn=os.setsid,
                               close_fds=True)
        self._input_buffer = ""

        self._view_id = view_id
        self._window_id = window_id
        self._topic = "extension.%s.socket" % self._view_id
        vispa.remote.send_topic(self._topic, window_id=self._window_id)

        self._thread = threading.Thread(target=self._stream)
        self._thread.daemon = True
        self._thread.start()

    def __del__(self):
        self.close()

    def close(self):
        if self.__process.poll() is None:
            self.__process.terminate()
        vispa.remote.send_topic(self._topic+".close", window_id=self._window_id)

    def resize(self, w, h):
        if self.__masterpty is None:
            return

        buf = array.array('h', [h, w, 0, 0])
        fcntl.ioctl(self.__masterpty, termios.TIOCSWINSZ, buf)

    def communicate(self, input_data, timeout=0.05):
        fout = self.__master_stdout.fileno()
        fin = self.__master_stdin.fileno()
        self._input_buffer += input_data
        r, w, _ = select.select([fout], [fin], [], timeout)
        if fin in w:
            count = os.write(fin, self._input_buffer)
            self._input_buffer = self._input_buffer[count:]
        if fout in r:
            return os.read(fout, 4096)

        return None

    def _stream(self):
        try:
            buffer_size = 1024*16
            fout = self.__master_stdout.fileno()
            returncode = self.__process.poll()
            self._running = True
            while self._running:
                returncode = self.__process.poll()
                r, _, _ = select.select([fout], [], [], 0.5)
                if fout in r:
                    vispa.remote.send_topic(self._topic+".data", window_id=self._window_id, data=os.read(fout, buffer_size))
                elif returncode is not None:
                    self.close()
                    return
        except:
            logger.exception("Terminal _stream")
            self.close()

    def read(self, timeout=0.05, buffer_size=(4096*4)):
        returncode = self.__process.poll()
        fout = self.__master_stdout.fileno()
        r, _, _ = select.select([fout], [], [], timeout if returncode is None else 0)
        if fout in r:
            return returncode, os.read(fout, buffer_size)
        else:
            return returncode, ""

    def write(self, input_data):
        fin = self.__master_stdin.fileno()
        os.write(fin, input_data.encode('utf8'))

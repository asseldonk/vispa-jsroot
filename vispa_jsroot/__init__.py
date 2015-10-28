# -*- coding: utf-8 -*-

from vispa.controller import AbstractController
from vispa.server import AbstractExtension

import cherrypy

class jsROOTController(AbstractController):
    pass


class jsROOTExtension(AbstractExtension):

    def name(self):
        return 'jsroot'

    def dependencies(self):
        return []

    def setup(self):
        self.add_controller(jsROOTController())
        # self.add_workspace_directoy()

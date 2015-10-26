# vispa-jsroot
Provides an extension for the usage of [JavaScript ROOT](https://github.com/linev/jsroot) within the [VISPA](https://vispa.physik.rwth-aachen.de/) web edition.

## Install
1. Clone or download VISPA ([https://vispa.physik.rwth-aachen.de/download](https://vispa.physik.rwth-aachen.de/download)). 
2. Clone the vispa-jsroot repository, within the jsroot repository initialize and update the submodules:
   ```shell
   git submodule init
   git submodule update
   ```

3. In the VISPA repository, create a symlink to the vispa-jsroot repository:
   ```shell
   ln -s pathToVispaJsrootRepository/vispa_jsroot/ pathToVispaRepository/vispa/extensions/
   ```

 # specify the node base image with your desired version node:<version>

FROM python:3.6-slim

RUN apt update

COPY . /app
COPY ./Test /app/Test
WORKDIR /app


# Debug
# RUN apt -y install openssh-server iproute2 vim curl tar
# RUN pip3 install pylint
# COPY id_rsa.pub /root/.ssh/authorized_keys
# EXPOSE 22
# End debug

RUN pip3 install -r requirements.txt

CMD ["python3","-u","thingVisor_phue.py"]